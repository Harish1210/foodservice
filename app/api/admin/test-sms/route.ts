/** ONE-TIME debug — DELETE after testing */
import { NextRequest, NextResponse } from "next/server";
import { toE164 } from "@/lib/sms";

function stripBom(s: string): string {
  let prev = "";
  while (s !== prev) {
    prev = s;
    if (s.charCodeAt(0) === 0xfeff) { s = s.slice(1); continue; }
    if (s.charCodeAt(0) === 0xef && s.charCodeAt(1) === 0xbb && s.charCodeAt(2) === 0xbf)
      { s = s.slice(3); continue; }
  }
  return s.trim();
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("to") ?? "+61426287362";

  const rawSid   = process.env.TWILIO_ACCOUNT_SID  ?? "";
  const rawToken = process.env.TWILIO_AUTH_TOKEN   ?? "";
  const rawFrom  = process.env.TWILIO_PHONE_NUMBER ?? "";

  const sid   = stripBom(rawSid);
  const token = stripBom(rawToken);
  const from  = stripBom(rawFrom);
  const to    = toE164(phone);

  try {
    const url   = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const creds = Buffer.from(`${sid}:${token}`).toString("base64");
    const res   = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ From: from, To: to, Body: "Dishly test SMS" }),
    });
    const data = await res.json() as Record<string, unknown>;
    return NextResponse.json({
      httpStatus: res.status,
      twilioOk:   res.ok,
      twilioSid:  data.sid,
      twilioError: data.message ?? data.error_message ?? null,
      sid:  sid.slice(0, 8) + "...",
      from,
      to,
      rawSidFirstCharCode: rawSid.charCodeAt(0),
      rawFromFirstCharCode: rawFrom.charCodeAt(0),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
