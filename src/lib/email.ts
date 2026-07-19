import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface GuestBookingConfirmationInput {
  to: string;
  guestName: string;
  masterName: string;
  masterPhone: string;
  startUtc: string;
  timezone: string;
  durationMinutes: number | null;
}

/**
 * Sends a guest booking confirmation email. No-ops (logs and returns) when
 * RESEND_API_KEY isn't set - the booking itself always succeeds regardless
 * of whether this email goes out, this is a best-effort notification only.
 */
export async function sendGuestBookingConfirmationEmail(
  input: GuestBookingConfirmationInput
): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set - skipping guest booking confirmation email");
    return;
  }

  const localTime = new Date(input.startUtc).toLocaleString("en-US", {
    timeZone: input.timezone,
    dateStyle: "full",
    timeStyle: "short",
  });

  try {
    await resend.emails.send({
      from: "Nail Visual <bookings@resend.dev>",
      to: input.to,
      subject: `Booking confirmed with ${input.masterName}`,
      html: `
        <p>Hi ${input.guestName},</p>
        <p>Your appointment with <strong>${input.masterName}</strong> is booked for:</p>
        <p><strong>${localTime}</strong>${input.durationMinutes ? ` (${input.durationMinutes} min)` : ""}</p>
        <p>${input.masterName} will contact you at the phone number you provided to confirm.
        Their contact number: ${input.masterPhone}.</p>
        <p>This booking was made as a guest - there's no account to manage it online,
        so please save this email as your confirmation.</p>
      `,
    });
  } catch (error) {
    // Never let an email failure surface as a booking failure - the booking
    // itself is already committed to the DB by the time this is called.
    console.error("Failed to send guest booking confirmation email", error);
  }
}
