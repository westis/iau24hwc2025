import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      focalX = 50,
      focalY = 50,
      zoom = 1.5,
      cropAreaPixels, // New: exact crop area from react-easy-crop
      bucket = "runner-photos",
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Download the original image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to fetch image");
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const originalWidth = metadata.width!;
    const originalHeight = metadata.height!;

    let left: number, top: number, cropSize: number;

    // If we have exact crop area from react-easy-crop, use it directly
    if (cropAreaPixels) {
      left = Math.round(cropAreaPixels.x);
      top = Math.round(cropAreaPixels.y);
      // Use the smaller of width/height to ensure square crop
      cropSize = Math.round(
        Math.min(cropAreaPixels.width, cropAreaPixels.height)
      );

      // Ensure crop area doesn't go out of bounds
      left = Math.max(0, Math.min(left, originalWidth - cropSize));
      top = Math.max(0, Math.min(top, originalHeight - cropSize));
    } else {
      // Fallback: Calculate the crop area based on focal point and zoom (old method)
      const cropRatio = 1 / zoom;
      const minDimension = Math.min(originalWidth, originalHeight);
      cropSize = Math.round(minDimension * cropRatio);

      // Calculate the top-left corner of the crop area
      // Focal point is in percentage (0-100)
      const focalXPx = (focalX / 100) * originalWidth;
      const focalYPx = (focalY / 100) * originalHeight;

      left = Math.round(focalXPx - cropSize / 2);
      top = Math.round(focalYPx - cropSize / 2);

      // Ensure crop area doesn't go out of bounds
      left = Math.max(0, Math.min(left, originalWidth - cropSize));
      top = Math.max(0, Math.min(top, originalHeight - cropSize));
    }

    // Generate avatar sizes: 80px (1x), 160px (2x), 320px (3x for very high DPI)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate ONE base filename for all sizes
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const baseFileName = `avatar-${timestamp}-${random}`;

    const avatarSizes = [
      { size: 80, suffix: "" },
      { size: 160, suffix: "@2x" },
      { size: 320, suffix: "@3x" },
    ];

    const uploadPromises = avatarSizes.map(async ({ size, suffix }) => {
      // Crop and resize
      const processedBuffer = await sharp(imageBuffer)
        .extract({
          left,
          top,
          width: cropSize,
          height: cropSize,
        })
        .resize(size, size, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 95, progressive: true })
        .toBuffer();

      // Use the same base filename for all sizes
      const fileName = `${baseFileName}${suffix}.jpg`;

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, processedBuffer, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

      return { size, url: publicUrl, path: fileName };
    });

    const uploadedAvatars = await Promise.all(uploadPromises);

    // Return the base URL (80px) as the main avatar
    const baseAvatar = uploadedAvatars.find((a) => a.size === 80)!;

    return NextResponse.json({
      success: true,
      avatarUrl: baseAvatar.url,
      avatarPath: baseAvatar.path,
      sizes: uploadedAvatars,
    });
  } catch (error) {
    console.error("Crop avatar error:", error);
    return NextResponse.json(
      {
        error: "Failed to crop avatar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
