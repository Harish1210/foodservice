import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const masked = dbUrl
    ? `${dbUrl.substring(0, 20)}...${dbUrl.substring(dbUrl.length - 10)}`
    : "UNDEFINED";

  try {
    // Dynamic import to avoid module-level singleton
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: dbUrl });
    const result = await pool.query("SELECT 1 as test");
    await pool.end();
    return NextResponse.json({ ok: true, dbUrlMasked: masked, result: result.rows });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({
      ok: false,
      dbUrlMasked: masked,
      message: error.message,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    }, { status: 500 });
  }
}
