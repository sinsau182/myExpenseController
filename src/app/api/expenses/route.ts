import { getExpenseFeed } from '@/lib/bank';

export async function GET() {
  const feed = await getExpenseFeed();

  return Response.json(feed, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}