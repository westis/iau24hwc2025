"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, X, Loader2, Image as ImageIcon, Edit } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import Image from "next/image";

interface ImageUploadProps {
  bucket: "runner-photos" | "team-photos";
  currentImageUrl?: string | null;
  currentFocalPoint?: { x: number; y: number } | null;
  currentZoom?: number | null;
  onUploadComplete: (
    url: string,
    path: string,
    focalPoint: { x: number; y: number },
    zoom: number
  ) => void;
  onDelete?: () => void;
  label?: string;
}

export function ImageUpload({
  bucket,
  currentImageUrl,
  currentFocalPoint,
  currentZoom,
  onUploadComplete,
  onDelete,
  label = "Upload Image",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentImageUrl || null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focal point modal state
  const [showFocalPointModal, setShowFocalPointModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [tempImagePath, setTempImagePath] = useState<string | null>(null);
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number }>(
    currentFocalPoint || { x: 50, y: 50 }
  );
  const [tempFocalPoint, setTempFocalPoint] = useState<{
    x: number;
    y: number;
  }>({ x: 50, y: 50 });
  const [zoom, setZoom] = useState<number>(
    typeof currentZoom === "number" ? currentZoom : 1.5
  );
  const imageRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Upload to API immediately
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Upload failed"
        );
      }

      const data = await response.json();

      // Store temp data and show focal point selector
      setTempImageUrl(data.url);
      setTempImagePath(data.path);
      setTempFocalPoint({ x: 50, y: 50 });
      setZoom(1.5); // Start with some zoom
      setShowFocalPointModal(true);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !tempImageUrl) return;

    const container = imageRef.current.getBoundingClientRect();
    
    // Get the actual image element to determine its natural dimensions
    const imgElement = imageRef.current.querySelector('img');
    if (!imgElement) return;

    const naturalWidth = imgElement.naturalWidth;
    const naturalHeight = imgElement.naturalHeight;
    
    if (!naturalWidth || !naturalHeight) return;

    // Calculate the displayed image dimensions with object-fit: contain
    const containerAspect = container.width / container.height;
    const imageAspect = naturalWidth / naturalHeight;
    
    let displayedWidth: number;
    let displayedHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspect > containerAspect) {
      // Image is wider - will have letterboxing on top/bottom
      displayedWidth = container.width;
      displayedHeight = container.width / imageAspect;
      offsetX = 0;
      offsetY = (container.height - displayedHeight) / 2;
    } else {
      // Image is taller - will have letterboxing on left/right
      displayedHeight = container.height;
      displayedWidth = container.height * imageAspect;
      offsetX = (container.width - displayedWidth) / 2;
      offsetY = 0;
    }

    // Calculate click position relative to the container
    const clickX = e.clientX - container.left;
    const clickY = e.clientY - container.top;

    // Check if click is within the actual image bounds
    if (
      clickX < offsetX ||
      clickX > offsetX + displayedWidth ||
      clickY < offsetY ||
      clickY > offsetY + displayedHeight
    ) {
      // Click was in the letterbox area, ignore it
      return;
    }

    // Calculate the percentage within the actual image
    const x = ((clickX - offsetX) / displayedWidth) * 100;
    const y = ((clickY - offsetY) / displayedHeight) * 100;

    setTempFocalPoint({ x, y });
  };

  const handleFocalPointConfirm = () => {
    if (!tempImageUrl) return;

    setPreviewUrl(tempImageUrl);
    setFocalPoint(tempFocalPoint);

    // If tempImagePath is null, we're just adjusting existing image, use current URL
    const pathToUse = tempImagePath || currentImageUrl || "";
    onUploadComplete(tempImageUrl, pathToUse, tempFocalPoint, zoom);

    setShowFocalPointModal(false);
    setTempImageUrl(null);
    setTempImagePath(null);
  };

  const handleFocalPointCancel = () => {
    setShowFocalPointModal(false);
    setTempImageUrl(null);
    setTempImagePath(null);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setPreviewUrl(null);
      onDelete();
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleAdjustFocalPoint = () => {
    if (!previewUrl) return;

    // Open focal point modal with current image and values
    setTempImageUrl(previewUrl);
    setTempImagePath(null); // No new upload, just adjusting existing
    setTempFocalPoint({ x: focalPoint.x, y: focalPoint.y });
    setZoom(typeof currentZoom === "number" ? currentZoom : 1.5);
    setShowFocalPointModal(true);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={handleButtonClick}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {label}
              </>
            )}
          </Button>

          {previewUrl && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdjustFocalPoint}
                disabled={isUploading}
              >
                <Edit className="h-4 w-4 mr-1" />
                Adjust Focal Point
              </Button>
              {onDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {previewUrl && (
          <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-border bg-muted">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              style={{
                objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
              }}
              unoptimized={previewUrl.startsWith("blob:")}
            />
            {/* Focal point indicator */}
            <div
              className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-lg pointer-events-none"
              style={{
                left: `${focalPoint.x}%`,
                top: `${focalPoint.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        )}

        {!previewUrl && (
          <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden border border-dashed border-border bg-muted flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No image selected</p>
            </div>
          </div>
        )}
      </div>

      {/* Focal Point Selector Modal */}
      <Dialog
        open={showFocalPointModal}
        onOpenChange={(open) => !open && handleFocalPointCancel()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Set Focal Point</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Image with focal point */}
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Click on the face or important area
                </h3>
                <div
                  ref={imageRef}
                  className="relative w-full h-64 bg-black rounded-lg overflow-hidden cursor-crosshair border-2 border-border"
                  onClick={handleImageClick}
                >
                  {tempImageUrl && (
                    <>
                      <Image
                        src={tempImageUrl}
                        alt="Set focal point"
                        fill
                        className="object-contain"
                        quality={100}
                        priority
                      />
                      {/* Focal point marker */}
                      <div
                        className="absolute w-6 h-6 pointer-events-none"
                        style={{
                          left: `${tempFocalPoint.x}%`,
                          top: `${tempFocalPoint.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {/* Center dot */}
                        <div
                          className="absolute left-1/2 top-1/2 w-3 h-3 bg-blue-500 border-2 border-white rounded-full shadow-lg"
                          style={{ transform: "translate(-50%, -50%)" }}
                        />
                        {/* Crosshair */}
                        <div
                          className="absolute left-1/2 top-0 w-0.5 h-2 bg-blue-500 shadow-lg"
                          style={{ transform: "translateX(-50%)" }}
                        />
                        <div
                          className="absolute left-1/2 bottom-0 w-0.5 h-2 bg-blue-500 shadow-lg"
                          style={{ transform: "translateX(-50%)" }}
                        />
                        <div
                          className="absolute top-1/2 left-0 h-0.5 w-2 bg-blue-500 shadow-lg"
                          style={{ transform: "translateY(-50%)" }}
                        />
                        <div
                          className="absolute top-1/2 right-0 h-0.5 w-2 bg-blue-500 shadow-lg"
                          style={{ transform: "translateY(-50%)" }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Circular avatar preview */}
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Avatar preview (80x80px)
                </h3>
                <div className="flex justify-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-border bg-black">
                    {tempImageUrl && (
                      <div
                        className="absolute inset-0"
                        style={{
                          transform: `scale(${
                            typeof zoom === "number" ? zoom : 1.5
                          })`,
                          transformOrigin: `${tempFocalPoint.x}% ${tempFocalPoint.y}%`,
                        }}
                      >
                        <Image
                          src={tempImageUrl}
                          alt="Avatar preview"
                          fill
                          className="object-cover"
                          style={{
                            objectPosition: `${tempFocalPoint.x}% ${tempFocalPoint.y}%`,
                          }}
                          quality={100}
                          priority
                        />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  This is how the avatar will appear on the profile
                </p>
              </div>
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Zoom</label>
                <span className="text-xs text-muted-foreground">
                  {(typeof zoom === "number" ? zoom : 1.5).toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[typeof zoom === "number" ? zoom : 1.5]}
                onValueChange={([value]) =>
                  setZoom(typeof value === "number" ? value : 1.5)
                }
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Click on the person&apos;s face, then
                adjust the zoom slider until the face fills the circular preview
                nicely.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleFocalPointCancel}>
              Cancel
            </Button>
            <Button onClick={handleFocalPointConfirm}>
              Confirm Focal Point
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
