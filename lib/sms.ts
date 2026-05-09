/**
 * SMS notifications via Twilio.
 *
 * Set these in your .env file:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+61xxxxxxxxx   (your Twilio number)
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN  ?? "";
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

/** Convert an AU local number to E.164 (+61…) */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("0"))  return `+61${digits.slice(1)}`;
  if (digits.length === 9)     return `+61${digits}`;      // already without leading 0
  return `+${digits}`;
}

/** Send one SMS. Returns true on success, false on failure (never throws). */
export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.warn("[SMS] Twilio env vars not set — skipping SMS to", to);
    return false;
  }
  if (!to) return false;

  const toE164Number = toE164(to);

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
    const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: FROM_NUMBER,
        To:   toE164Number,
        Body: body,
      }),
    });

    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) {
      console.error("[SMS] Twilio error:", data.message);
      return false;
    }
    console.log(`[SMS] Sent to ${toE164Number} — SID: ${data.sid}`);
    return true;
  } catch (err) {
    console.error("[SMS] Unexpected error:", err);
    return false;
  }
}

/** ── Message templates ── */
const APP = "Home Food Service";

export const SMS = {
  /** Sent to customer immediately after placing an order */
  orderConfirmed: (orderNumber: string, type: string, estimatedMins: number) =>
    `🧾 ${APP}: Order #${orderNumber} confirmed! ` +
    `Type: ${type === "dine-in" ? "Dine-in" : type === "pickup" ? "Pickup" : "Delivery"}. ` +
    `Est. time: ~${estimatedMins} mins. We'll keep you updated!`,

  /** Sent to customer when vendor starts cooking */
  orderPreparing: (orderNumber: string) =>
    `🍳 ${APP}: Great news! Your order #${orderNumber} is now being prepared fresh in the kitchen.`,

  /** Sent to customer when food is ready (pickup orders) */
  orderReadyPickup: (orderNumber: string, pickupCode: string) =>
    `✅ ${APP}: Your order #${orderNumber} is READY for pickup! Show code ${pickupCode} at the counter.`,

  /** Sent to customer when food is ready (delivery orders) */
  orderReadyDelivery: (orderNumber: string) =>
    `✅ ${APP}: Your order #${orderNumber} is ready and about to be picked up for delivery.`,

  /** Sent to customer when driver picks up */
  orderOutForDelivery: (orderNumber: string) =>
    `🚚 ${APP}: Your order #${orderNumber} is on its way! Your driver is heading to you now.`,

  /** Sent to customer when delivered */
  orderDelivered: (orderNumber: string) =>
    `🎉 ${APP}: Order #${orderNumber} delivered! Enjoy your meal. Thank you for ordering with us! ⭐`,

  /** Sent to vendor when a new order arrives */
  newOrderAlert: (orderNumber: string, type: string, itemCount: number, total: number) =>
    `🔔 ${APP}: NEW ORDER #${orderNumber}! ` +
    `${type === "dine-in" ? "Dine-in" : type === "pickup" ? "Pickup" : "Delivery"} — ` +
    `${itemCount} item${itemCount !== 1 ? "s" : ""} — $${total.toFixed(2)}. Check your dashboard!`,

  /** Sent to vendor when order is cancelled */
  orderCancelled: (orderNumber: string) =>
    `❌ ${APP}: Order #${orderNumber} has been cancelled.`,
};
