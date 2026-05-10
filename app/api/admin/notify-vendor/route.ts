/** ONE-TIME — sends approval SMS to a vendor by phone. Delete after use. */
import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/sms";

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone") ?? "0451792182";
  const name  = req.nextUrl.searchParams.get("name")  ?? "Vinoda";
  try {
    const message =
      `🎉 Congratulations ${name}! Your kitchen has been approved on Dishly.\n\n` +
      `You can now log in and start adding your menu items:\n` +
      `https://foodservice-ruddy.vercel.app/login?role=vendor\n\n` +
      `Once your menu is ready, customers can start ordering. Welcome aboard! 🍽️`;

    const sent = await sendSMS(phone, message);
    return NextResponse.json({ sent, name, phone });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
