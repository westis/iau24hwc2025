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
    if (body.photo_crop_x !== undefined) {
      updates.push(`photo_crop_x = $${paramIndex++}`);
      values.push(body.photo_crop_x);
    }
    if (body.photo_crop_y !== undefined) {
      updates.push(`photo_crop_y = $${paramIndex++}`);
      values.push(body.photo_crop_y);
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

    // If photo settings changed, generate cropped avatar
    if (
      body.photo_url !== undefined ||
      body.photo_focal_x !== undefined ||
      body.photo_focal_y !== undefined ||
      body.photo_zoom !== undefined
    ) {
      // Get current values to fill in any missing parameters
      const currentRunner = await db.query(
        "SELECT photo_url, photo_focal_x, photo_focal_y, photo_zoom FROM runners WHERE id = $1",
        [runnerId]
      );

      if (currentRunner.rows.length > 0) {
        const current = currentRunner.rows[0];
        const photoUrl = body.photo_url ?? current.photo_url;
        const focalX = body.photo_focal_x ?? current.photo_focal_x ?? 50;
        const focalY = body.photo_focal_y ?? current.photo_focal_y ?? 50;
        const zoom = body.photo_zoom ?? current.photo_zoom ?? 1.5;

        // Only generate avatar if we have a photo URL
        if (photoUrl) {
          try {
            const cropResponse = await fetch(
              `${
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
              }/api/upload/crop-avatar`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageUrl: photoUrl,
                  focalX,
                  focalY,
                  zoom,
                  bucket: "runner-photos",
                }),
              }
            );

            if (cropResponse.ok) {
              const { avatarUrl } = await cropResponse.json();
              updates.push(`avatar_url = $${paramIndex++}`);
              values.push(avatarUrl);
            } else {
              console.error(
                "Failed to generate avatar:",
                await cropResponse.text()
              );
            }
          } catch (error) {
            console.error("Error generating avatar:", error);
            // Continue without avatar - not a critical failure
          }
        } else if (body.photo_url === null) {
          // Photo was removed, clear avatar
          updates.push(`avatar_url = $${paramIndex++}`);
          values.push(null);
        }
      }
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
