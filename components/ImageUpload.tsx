"use client";

import { useState, useCallback, useRef } from "react";
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
import Cropper from "react-easy-crop";
import { Area } from "react-easy-crop";

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
  
  // react-easy-crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.5);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedArea);
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

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
      setCrop({ x: 0, y: 0 });
      setZoom(1.5);
      setShowFocalPointModal(true);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFocalPointConfirm = async () => {
    if (!tempImageUrl || !croppedArea) return;

    // The croppedArea is already in percentages!
    // The focal point is the center of the cropped area
    const focalPoint = {
      x: croppedArea.x + (croppedArea.width / 2),
      y: croppedArea.y + (croppedArea.height / 2),
    };

    setPreviewUrl(tempImageUrl);

    // If tempImagePath is null, we're just adjusting existing image, use current URL
    const pathToUse = tempImagePath || currentImageUrl || "";
    onUploadComplete(tempImageUrl, pathToUse, focalPoint, zoom);

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

    setTempImageUrl(previewUrl);
    setTempImagePath(null);
    setCrop({ x: 0, y: 0 });
    
    const currentZoomValue =
      typeof currentZoom === "number" && !isNaN(currentZoom) ? currentZoom : 1.5;
    setZoom(currentZoomValue);

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
                Adjust Crop
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
              unoptimized={previewUrl.startsWith("blob:")}
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

      {/* Focal Point Selector Modal with react-easy-crop */}
      <Dialog
        open={showFocalPointModal}
        onOpenChange={(open) => !open && handleFocalPointCancel()}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Avatar</DialogTitle>
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
                  Drag and zoom to crop your avatar
                </h3>
                <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
                  {tempImageUrl && (
                    <Cropper
                      image={tempImageUrl}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Drag to reposition, scroll or use slider to zoom
                </p>
              </div>
            </div>

            {/* Zoom Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Zoom</label>
                <span className="text-xs text-muted-foreground">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Drag the image to center your face, then zoom in/out for the perfect crop!
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleFocalPointCancel}>
              Cancel
            </Button>
            <Button onClick={handleFocalPointConfirm}>
              Confirm Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
