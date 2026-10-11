import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/data/live";
import { cachedData } from "@/lib/data/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await cachedData("markets", 900_000, getMarketData);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "s-maxage=900, stale-while-revalidate=1800"
    }
  });
}
