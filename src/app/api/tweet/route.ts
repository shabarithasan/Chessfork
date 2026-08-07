import type { NextRequest } from "next/server";
import { getTweet } from "react-tweet/api";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing tweet id", { status: 400 });

  try {
    const tweet = await getTweet(id);
    if (!tweet) return new Response("Tweet not found", { status: 404 });
    return Response.json({ data: tweet });
  } catch (error) {
    console.error(error);
    return new Response("Error fetching tweet", { status: 400 });
  }
}
