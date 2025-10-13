import { NextRequest, NextResponse } from "next/server";
import {
  getNews,
  createNews,
  linkRunnersToNews,
  getRunnersByNewsId,
} from "@/lib/db/database";
import type { NewsItemCreate } from "@/types/news";
import { revalidatePath } from "next/cache";

// Enable ISR: revalidate every 2 minutes
export const revalidate = 120;

// GET /api/news - Get all news (published only by default, or all for admins)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeUnpublished =
      searchParams.get("includeUnpublished") === "true";
    const includeRunnerLinks =
      searchParams.get("includeRunnerLinks") === "true";

    const news = await getNews(!includeUnpublished);

    // Optionally fetch linked runner IDs for each news item
    if (includeRunnerLinks) {
      for (const item of news) {
        item.linkedRunnerIds = await getRunnersByNewsId(item.id);
      }
    }

    return NextResponse.json(
      {
        news,
        count: news.length,
      },
      {
        headers: {
          // Cache for 2 minutes, serve stale for 4 minutes while revalidating
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
        },
      }
    );
  } catch (error) {
    console.error("Get news error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/news - Create new news item (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NewsItemCreate;

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const news = await createNews(body);

    // Link runners if provided
    if (body.runnerIds && body.runnerIds.length > 0) {
      await linkRunnersToNews(news.id, body.runnerIds);
      news.linkedRunnerIds = body.runnerIds;
    }

    // 🔥 ON-DEMAND REVALIDATION
    revalidatePath("/news");
    revalidatePath("/api/news");

    return NextResponse.json(news, { status: 201 });
  } catch (error) {
    console.error("Create news error:", error);
    return NextResponse.json(
      { error: "Failed to create news", details: String(error) },
      { status: 500 }
    );
  }
}
