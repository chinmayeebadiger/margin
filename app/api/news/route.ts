import { getNewsData } from "@/lib/data/live";
import { cachedData } from "@/lib/data/cache";

export async function GET() {
  return Response.json(await cachedData("news", 1_800_000, getNewsData), {
    headers: { "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600" }
  });
}
