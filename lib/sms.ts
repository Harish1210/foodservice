/**
 * SMS notifications via Twilio.
 *
 * Set these in your Vercel / .env file:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+61xxxxxxxxx   (your Twilio number)
 */

/** Strip BOM (U+FEFF) that some editors/copy-paste add — it breaks HTTP headers. */
function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function getCreds() {
  return {
    sid:   stripBom(process.env.TWILIO_ACCOUNT_SID  ?? ""),
    token: stripBom(process.env.TWILIO_AUTH_TOKEN   ?? ""),
    from:  stripBom(process.env.TWILIO_PHONE_NUMBER ?? ""),
  };
}

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
  const { sid, token, from } = getCreds();

  if (!sid || !token || !from) {
    console.warn("[SMS] Twilio env vars not set — skipping SMS to", to);
    return false;
  }
  if (!to) return false;

  const toE164Number = toE164(to);

  try {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const creds = Buffer.from(`${sid}:${token}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
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
