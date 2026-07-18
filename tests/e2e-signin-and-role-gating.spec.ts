import { test, expect } from "@playwright/test";

// Replaces the old e2e-reference-offer spec, which exercised /api/references
// and /api/offers - endpoints from an earlier iteration of this app that no
// longer exist. This covers the actual current flow: registration, sign-in,
// and role-gated route access (client vs master).

test("client can register, sign in, and is redirected away from master-only routes", async ({
  page,
  request,
}) => {
  const email = `e2e-client-${Date.now()}@example.com`;
  const password = "testpass123";

  const registerRes = await request.post("/api/auth/register", {
    data: { email, password, role: "client" },
  });
  expect(registerRes.ok()).toBeTruthy();

  await page.goto("/en/signin");
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();

  // Client sign-in redirects to home ("/"), not the master-only /profile.
  await expect(page).toHaveURL(/\/en\/?$/);

  // Client-only route should load.
  await page.goto("/en/bookings");
  await expect(page).toHaveURL(/\/en\/bookings/);

  // Master-only route should redirect a client session away, per
  // canAccessRoute() being enforced in middleware.
  await page.goto("/en/profile");
  await expect(page).not.toHaveURL(/\/en\/profile/);
});
