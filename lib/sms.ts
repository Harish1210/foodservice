/**
 * SMS notifications via Twilio.
 *
 * Set these in your Vercel / .env file:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+61xxxxxxxxx   (your Twilio number)
 */

/** Strip ALL leading BOM markers + trim whitespace.
 *  Vercel env vars copied from some terminals end up with a double-BOM:
 *  the 3-byte UTF-8 BOM (0xEF 0xBB 0xBF stored as ï»¿) followed by the
 *  Unicode BOM (U+FEFF). Loop until nothing more can be stripped. */
function stripBom(s: string): string {
  let prev = "";
  while (s !== prev) {
    prev = s;
    // Unicode BOM (U+FEFF)
    if (s.charCodeAt(0) === 0xfeff) { s = s.slice(1); continue; }
    // UTF-8 BOM stored as three Latin-1 chars: ï(0xEF) »(0xBB) ¿(0xBF)
    if (s.charCodeAt(0) === 0xef && s.charCodeAt(1) === 0xbb && s.charCodeAt(2) === 0xbf)
      { s = s.slice(3); continue; }
  }
  return s.trim();
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
  if (digits.length === 9)     return `+61${digits}`;
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
    const url   = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const creds = Buffer.from(`${sid}:${token}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: toE164Number, Body: body }),
    });

    const data = await res.json() as { sid?: string; message?: string };
    if (!res.ok) { console.error("[SMS] Twilio error:", data.message); return false; }
    console.log(`[SMS] Sent to ${toE164Number} — SID: ${data.sid}`);
    return true;
  } catch (err) {
    console.error("[SMS] Unexpected error:", err);
    return false;
  }
}

/** ── Message templates ── */
const APP = "Dishly";

export const SMS = {
  /** Sent to customer immediately after placing an order */
  orderConfirmed: (orderNumber: string, type: string, estimatedMins: number, pickupAddress?: string | null) => {
    const typeLabel = type === "dine-in" ? "Dine-in" : type === "pickup" ? "Pickup" : "Delivery";
    const base = `🧾 ${APP}: Order #${orderNumber} confirmed! Type: ${typeLabel}. Est. ~${estimatedMins} mins.`;
    if (type === "pickup" && pickupAddress) {
      return `${base} Pickup address: ${pickupAddress}. We'll SMS you when ready!`;
    }
    return `${base} We'll keep you updated!`;
  },

  /** Sent to customer when vendor starts cooking */
  orderPreparing: (orderNumber: string) =>
    `🍳 ${APP}: Great news! Your order #${orderNumber} is now being prepared fresh in the kitchen.`,

  /** Sent to customer when food is ready (pickup orders) */
  orderReadyPickup: (orderNumber: string, pickupCode: string, pickupAddress?: string | null) => {
    const base = `✅ ${APP}: Order #${orderNumber} is READY for pickup! Show code: ${pickupCode}.`;
    return pickupAddress ? `${base} Address: ${pickupAddress}` : base;
  },

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
