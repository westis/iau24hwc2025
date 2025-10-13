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

  // For drag-to-position
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

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
      setImagePosition({ x: 0, y: 0 }); // Center the image
      setShowFocalPointModal(true);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleFocalPointConfirm = () => {
    if (!tempImageUrl) return;

    // Convert drag position + zoom to focal point percentage
    // The visible area's center is the focal point
    const previewSize = 320; // Container size
    const calculatedFocalPoint = {
      x: 50 - (imagePosition.x / (previewSize * zoom)) * 100,
      y: 50 - (imagePosition.y / (previewSize * zoom)) * 100,
    };
    
    // Clamp to 0-100
    calculatedFocalPoint.x = Math.max(0, Math.min(100, calculatedFocalPoint.x));
    calculatedFocalPoint.y = Math.max(0, Math.min(100, calculatedFocalPoint.y));

    console.log('Saving avatar crop settings:', {
      imagePosition,
      zoom,
      calculatedFocalPoint,
      tempImagePath,
      tempImageUrl,
    });

    setPreviewUrl(tempImageUrl);
    setFocalPoint(calculatedFocalPoint);
    setTempFocalPoint(calculatedFocalPoint);

    // If tempImagePath is null, we're just adjusting existing image, use current URL
    const pathToUse = tempImagePath || currentImageUrl || "";
    onUploadComplete(tempImageUrl, pathToUse, calculatedFocalPoint, zoom);

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

    const currentZoomValue =
      typeof currentZoom === "number" ? currentZoom : 1.5;
    setZoom(currentZoomValue);

    // Convert focal point percentage to drag position
    const previewSize = 320;
    const dragX =
      ((50 - focalPoint.x) * (previewSize * currentZoomValue)) / 100;
    const dragY =
      ((50 - focalPoint.y) * (previewSize * currentZoomValue)) / 100;
    
    console.log('Loading avatar crop settings:', {
      focalPoint,
      currentZoom: currentZoomValue,
      calculatedDragPosition: { x: dragX, y: dragY },
      previewUrl,
    });
    
    setImagePosition({ x: dragX, y: dragY });

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

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2 text-center">
                  Drag the image to position it. What you see is what you get!
                </h3>
                <div className="flex justify-center">
                  <div
                    ref={imageRef}
                    className="relative w-80 h-80 rounded-full overflow-hidden border-4 border-primary bg-black cursor-move select-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    {tempImageUrl && (
                      <div
                        style={{
                          position: "absolute",
                          width: "100%",
                          height: "100%",
                          transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoom})`,
                          transformOrigin: "center center",
                          transition: isDragging
                            ? "none"
                            : "transform 0.1s ease-out",
                        }}
                      >
                        <Image
                          src={tempImageUrl}
                          alt="Position your image"
                          fill
                          className="object-cover pointer-events-none"
                          quality={100}
                          priority
                          draggable={false}
                        />
                      </div>
                    )}
                    {/* Overlay hint */}
                    {!isDragging && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                          Drag to reposition
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  This circular preview shows exactly how your 80x80px avatar will
                  appear
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
                onValueChange={handleZoomChange}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground text-center">
                Use the slider to zoom in/out
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Drag the image to center the face in the
                square, then use the zoom slider to get the perfect crop. The
                exact area you see will be your avatar!
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
