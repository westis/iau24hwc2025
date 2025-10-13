import { NextRequest, NextResponse } from "next/server";
import { getRunnerById, getDatabase } from "@/lib/db/database";
import { revalidatePath } from "next/cache";

// Enable ISR: revalidate every 60 seconds (same as /api/runners)
export const revalidate = 60;

// GET /api/runners/[id] - Get a single runner by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runnerId = parseInt(id);

    if (isNaN(runnerId)) {
      return NextResponse.json({ error: "Invalid runner ID" }, { status: 400 });
    }

    const runner = await getRunnerById(runnerId);

    if (!runner) {
      return NextResponse.json({ error: "Runner not found" }, { status: 404 });
    }

    return NextResponse.json(runner, {
      headers: {
        // Cache for 60 seconds, serve stale for 2 minutes while revalidating
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Error fetching runner:", error);
    return NextResponse.json(
      { error: "Failed to fetch runner", details: String(error) },
      { status: 500 }
    );
  }
}

// PATCH /api/runners/[id] - Update a runner (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const runnerId = parseInt(id);

    if (isNaN(runnerId)) {
      return NextResponse.json({ error: "Invalid runner ID" }, { status: 400 });
    }

    const body = await request.json();
    const db = getDatabase();

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.firstname !== undefined) {
      updates.push(`firstname = $${paramIndex++}`);
      values.push(body.firstname);
    }
    if (body.lastname !== undefined) {
      updates.push(`lastname = $${paramIndex++}`);
      values.push(body.lastname);
    }
    if (body.nationality !== undefined) {
      updates.push(`nationality = $${paramIndex++}`);
      values.push(body.nationality);
    }
    if (body.gender !== undefined) {
      updates.push(`gender = $${paramIndex++}`);
      values.push(body.gender);
    }
    if (body.dns !== undefined) {
      updates.push(`dns = $${paramIndex++}`);
      values.push(body.dns);
    }
    if (body.photo_url !== undefined) {
      updates.push(`photo_url = $${paramIndex++}`);
      values.push(body.photo_url);
    }
    if (body.photo_focal_x !== undefined) {
      updates.push(`photo_focal_x = $${paramIndex++}`);
      values.push(body.photo_focal_x);
    }
    if (body.photo_focal_y !== undefined) {
      updates.push(`photo_focal_y = $${paramIndex++}`);
      values.push(body.photo_focal_y);
    }
    if (body.photo_zoom !== undefined) {
      updates.push(`photo_zoom = $${paramIndex++}`);
      values.push(body.photo_zoom);
    }
    if (body.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(body.bio);
    }
    if (body.instagram_url !== undefined) {
      updates.push(`instagram_url = $${paramIndex++}`);
      values.push(body.instagram_url);
    }
    if (body.strava_url !== undefined) {
      updates.push(`strava_url = $${paramIndex++}`);
      values.push(body.strava_url);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(runnerId);
    const result = await db.query(
      `UPDATE runners SET ${updates.join(
        ", "
      )} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Runner not found" }, { status: 404 });
    }

    // 🔥 ON-DEMAND REVALIDATION - Immediately clear cache!
    revalidatePath("/participants");
    revalidatePath(`/runners/${id}`);
    revalidatePath("/api/runners");
    revalidatePath(`/api/runners/${id}`);

    const updatedRunner = await getRunnerById(runnerId);
    return NextResponse.json(updatedRunner);
  } catch (error) {
    console.error("Error updating runner:", error);
    return NextResponse.json(
      { error: "Failed to update runner", details: String(error) },
      { status: 500 }
    );
  }
}
