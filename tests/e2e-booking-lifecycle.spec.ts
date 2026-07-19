import { config } from "dotenv";
config({ path: ".env.local" });

import { test, expect } from "@playwright/test";
import postgres from "postgres";

// Covers the full booking lifecycle end to end - the core business logic of
// this app, which previously had ZERO automated test coverage. A timezone
// bug in src/lib/slots.ts (fixed earlier) caused every booking attempt to
// fail with "This slot is no longer available", and it was only caught by
// manual testing. This test exists so a regression like that fails CI
// instead of requiring a human to click through the app.
//
// Flow covered:
//   1. Register a master via /api/auth/register
//   2. Complete onboarding via the real UI (/en/onboarding)
//   3. Seed a full-week schedule + a bookable post directly via SQL
//      (posts require an uploaded image via UploadThing, and a full
//      booking needs a master schedule - neither is available in this
//      environment, so we bypass the upload/schedule-setup UI and insert
//      rows directly, exactly as done in ad-hoc verification scripts)
//   4. Register + sign in a client
//   5. Navigate to /en/post/{postId}?source=profile (source=profile
//      switches PostDetailClient into direct-booking mode) and drive
//      BookingModal through all 5 steps (date -> time -> notes -> confirm
//      -> success)
//   6. Assert the booking row is "pending" in the DB
//   7. Sign in as the master, confirm the booking via /en/profile/calendar
//   8. Assert the booking row transitions to "confirmed" in the DB

const sql = postgres(process.env.DATABASE_URL!);

test.describe("booking lifecycle", () => {
  test("client books a post and master confirms it", async ({ browser, request }) => {
    test.setTimeout(90_000);

    const timestamp = Date.now();
    const masterEmail = `e2e-master-${timestamp}@example.com`;
    const clientEmail = `e2e-client-${timestamp}@example.com`;
    const password = "testpass123";

    // Master and client each get their own isolated browser context (own
    // cookie jar) instead of sharing one `page` and signing out in between -
    // NextAuth's default /api/auth/signout confirmation page is awkward to
    // drive reliably in a script, and separate contexts are a truer model
    // of "two different users" anyway.
    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();

    // ── 1. Register master ─────────────────────────────────────────────
    const masterRegisterRes = await request.post("/api/auth/register", {
      data: { email: masterEmail, password, role: "master" },
    });
    expect(masterRegisterRes.ok()).toBeTruthy();
    const { id: masterId } = await masterRegisterRes.json();

    // ── 2. Sign in as master, complete onboarding via real UI ──────────
    await masterPage.goto("/en/signin");
    await masterPage.getByPlaceholder("your@email.com").fill(masterEmail);
    await masterPage.getByPlaceholder("Password").fill(password);
    await masterPage.getByRole("button", { name: "Sign In" }).click();

    // No master profile yet -> /profile redirects to /onboarding.
    await expect(masterPage).toHaveURL(/\/en\/onboarding/, { timeout: 15_000 });

    await masterPage.getByPlaceholder("e.g. Elena's Nails").fill("E2E Test Nails");
    await masterPage.getByPlaceholder("+1 234 567 8900").fill("+1 234 567 8900");
    await masterPage.getByPlaceholder("e.g. New York").fill("New York");
    await masterPage.getByRole("button", { name: "Start" }).click();

    await expect(masterPage).toHaveURL(/\/en\/profile/, { timeout: 15_000 });

    // ── 3. Seed schedule (full week, 00:00-23:59 UTC) + a bookable post ─
    const [schedule] = await sql`
      INSERT INTO master_schedules (master_id, timezone)
      VALUES (${masterId}, 'UTC')
      RETURNING id
    `;
    const scheduleId = schedule.id as string;

    // 1=Mon ... 7=Sun - cover every day so slot availability never depends
    // on which day of the week the test happens to run.
    for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
      await sql`
        INSERT INTO schedule_ranges (schedule_id, day_of_week, start_time, end_time)
        VALUES (${scheduleId}, ${dayOfWeek}, '00:00', '23:59')
      `;
    }

    // next.config.ts only allow-lists images.unsplash.com / images.pexels.com
    // for next/image - any other host makes the whole page throw a client
    // render error (caught by an ErrorBoundaryHandler, blanking the page),
    // so the seeded post must use an allow-listed image host.
    const [post] = await sql`
      INSERT INTO posts (master_id, image_url, price, currency, duration_minutes, description)
      VALUES (${masterId}, 'https://images.unsplash.com/photo-1604654894610-df63bc536371', 5000, 'USD', 60, 'E2E test service')
      RETURNING id
    `;
    const postId = post.id as string;

    // ── 4. Register + sign in as client (separate browser context) ─────
    const clientRegisterRes = await request.post("/api/auth/register", {
      data: { email: clientEmail, password, role: "client" },
    });
    expect(clientRegisterRes.ok()).toBeTruthy();

    const clientContext = await browser.newContext();
    const clientPage = await clientContext.newPage();

    await clientPage.goto("/en/signin");
    await clientPage.getByPlaceholder("your@email.com").fill(clientEmail);
    await clientPage.getByPlaceholder("Password").fill(password);
    await clientPage.getByRole("button", { name: "Sign In" }).click();
    await expect(clientPage).toHaveURL(/\/en\/?$/, { timeout: 15_000 });

    // ── 5. Book the post through the BookingModal UI ────────────────────
    await clientPage.goto(`/en/post/${postId}?source=profile`);

    await clientPage.getByRole("button", { name: "Book Appointment" }).click();

    // Step 1: date picker - pick a day OTHER than "today". A full
    // 00:00-23:59 schedule can have zero slots left for "today" very late
    // in the day (all slots already past "now + 15min buffer" in
    // src/lib/slots.ts), which is correct behavior, not a bug. Picking a
    // future day avoids that flakiness.
    const dayButtons = clientPage.locator("button").filter({ hasText: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/ });
    await expect(dayButtons.first()).toBeVisible({ timeout: 10_000 });
    await dayButtons.nth(1).click();

    // Step 2: time slot grid.
    await expect(clientPage.getByText("Choose a time")).toBeVisible({ timeout: 10_000 });
    await expect(clientPage.getByText("No available slots for this day.")).not.toBeVisible();
    const slotButtons = clientPage.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(slotButtons.first()).toBeVisible({ timeout: 10_000 });
    await slotButtons.first().click();

    // Step 3: notes.
    await expect(clientPage.getByText("Any notes for the master?")).toBeVisible();
    await clientPage.getByPlaceholder(/I prefer gel base/).fill("E2E test booking notes");
    await clientPage.getByRole("button", { name: "Continue" }).click();

    // Step 4: preview / confirm.
    await expect(clientPage.getByText("Confirm your booking")).toBeVisible({ timeout: 10_000 });
    await clientPage.getByRole("button", { name: "Confirm Booking" }).click();

    // Step 5: success.
    await expect(clientPage.getByText("Booking sent!")).toBeVisible({ timeout: 10_000 });

    // ── 6. Assert booking row is "pending" ──────────────────────────────
    const [pendingBooking] = await sql`
      SELECT id, status FROM bookings
      WHERE post_id = ${postId} AND master_id = ${masterId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    expect(pendingBooking).toBeTruthy();
    expect(pendingBooking.status).toBe("pending");
    const bookingId = pendingBooking.id as string;

    // ── 7. Master (still signed in on its own context) confirms via the
    //      calendar UI ──────────────────────────────────────────────────
    await masterPage.goto("/en/profile/calendar");

    // BookingModal's date picker is browser-local ("today" = the browser's
    // system timezone), while WeekPicker (this calendar) is master-timezone-
    // aware - the two can disagree on which index is "the same day" for a
    // master whose schedule timezone differs from the browser's. Scan
    // nearby days instead of assuming a fixed index lines up between them.
    const calendarDayButtons = masterPage.locator("button").filter({ hasText: /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/ });
    await expect(calendarDayButtons.first()).toBeVisible({ timeout: 10_000 });

    const dayButtonCount = await calendarDayButtons.count();
    const confirmButton = masterPage.getByRole("button", { name: "Confirm" });
    for (let i = 0; i < Math.min(dayButtonCount, 5); i++) {
      await calendarDayButtons.nth(i).click();
      await expect(masterPage.getByText("Loading...")).toHaveCount(0, { timeout: 5000 }).catch(() => {});
      if (await confirmButton.first().isVisible().catch(() => false)) break;
    }
    await expect(confirmButton.first()).toBeVisible({ timeout: 10_000 });
    await confirmButton.first().click();

    // ── 8. Assert booking row transitioned to "confirmed" ───────────────
    await expect(async () => {
      const [confirmedBooking] = await sql`
        SELECT status FROM bookings WHERE id = ${bookingId}
      `;
      expect(confirmedBooking.status).toBe("confirmed");
    }).toPass({ timeout: 10_000 });

    await masterContext.close();
    await clientContext.close();
  });

  test.afterAll(async () => {
    await sql.end();
  });
});
