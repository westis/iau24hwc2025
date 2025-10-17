import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/database";

// GET /api/news/previews - Get men's and women's preview articles
export async function GET() {
  try {
    const db = getDatabase();

    const result = await db.query(`
      SELECT id, title, preview_url, is_preview_men, is_preview_women
      FROM news
      WHERE (is_preview_men = TRUE OR is_preview_women = TRUE)
        AND published = TRUE
        AND preview_url IS NOT NULL
    `);

    const previews = {
      men: result.rows.find((row) => row.is_preview_men),
      women: result.rows.find((row) => row.is_preview_women),
    };

    return NextResponse.json(previews);
  } catch (error) {
    console.error("Error fetching preview articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch preview articles" },
      { status: 500 }
    );
  }
}









