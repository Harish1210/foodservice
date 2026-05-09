import { NextRequest, NextResponse } from "next/server";
import { toE164 } from "@/lib/sms";

/** GET /api/test-sms?to=+61400000000  — raw Twilio test with full error detail */
export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Pass ?to=+61xxxxxxxxx" }, { status: 400 });
  }

  const sid   = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN  ?? "";
  const from  = process.env.TWILIO_PHONE_NUMBER ?? "";
  const toNum = toE164(to);

  if (!sid || !token || !from) {
    return NextResponse.json({ error: "Twilio env vars missing", sid: !!sid, token: !!token, from: !!from }, { status: 500 });
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const creds = Buffer.from(`${sid}:${token}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: from,
      To:   toNum,
      Body: "✅ Home Food Service: SMS test — your notifications are working!",
    }),
  });

  const data = await res.json() as Record<string, unknown>;

  return NextResponse.json({
    httpStatus: res.status,
    success:    res.ok,
    twilioSid:  data.sid,
    twilioError: res.ok ? null : { code: data.code, message: data.message, moreInfo: data.more_info },
    from,
    to: toNum,
  });
}
