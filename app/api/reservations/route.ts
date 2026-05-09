import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { guestName, guestEmail, guestPhone, date, time, partySize, notes } = body;

    // Check availability: find tables with enough capacity
    const tables = await prisma.table.findMany({
      where: { capacity: { gte: parseInt(partySize) }, isAvailable: true },
      orderBy: { capacity: "asc" },
    });

    if (tables.length === 0) {
      return NextResponse.json({ error: "No tables available for that party size" }, { status: 400 });
    }

    // Check existing reservations at that time
    const existingDate = new Date(date);
    const existingReservations = await prisma.reservation.findMany({
      where: {
        date: existingDate,
        time,
        status: { in: ["pending", "confirmed"] },
      },
    });

    const takenTables = new Set(existingReservations.map((r) => r.tableNumber));
    const available = tables.find((t) => !takenTables.has(t.number));

    if (!available) {
      return NextResponse.json({ error: "No tables available at that time. Please choose a different time." }, { status: 400 });
    }

    const reservation = await prisma.reservation.create({
      data: {
        guestName,
        guestEmail,
        guestPhone,
        date: existingDate,
        time,
        partySize: parseInt(partySize),
        tableNumber: available.number,
        status: "confirmed",
        notes,
      },
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    console.error("Reservation error:", err);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      orderBy: { date: "desc" },
      take: 100,
    });
    return NextResponse.json({ reservations });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
  }
}
