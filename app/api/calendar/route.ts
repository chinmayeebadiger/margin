import { NextResponse } from "next/server";
import { getCalendarData } from "@/lib/data/live";
import { cachedData } from "@/lib/data/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await cachedData("calendar", 1_800_000, getCalendarData);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600"
    }
  });
}
