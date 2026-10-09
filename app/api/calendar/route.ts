import { NextResponse } from "next/server";
import { getCalendarData } from "@/lib/data/live";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getCalendarData();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
