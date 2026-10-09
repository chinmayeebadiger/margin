import { NextResponse } from "next/server";
import { getMarketData } from "@/lib/data/live";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getMarketData();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "s-maxage=900, stale-while-revalidate=1800"
    }
  });
}
