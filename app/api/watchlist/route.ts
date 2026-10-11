import { getWatchlistData } from "@/lib/data/live";
import { cachedData } from "@/lib/data/cache";

export async function GET() {
  return Response.json(
    await cachedData("watchlist", 900_000, getWatchlistData),
    {
      headers: { "Cache-Control": "s-maxage=900, stale-while-revalidate=1800" }
    }
  );
}
