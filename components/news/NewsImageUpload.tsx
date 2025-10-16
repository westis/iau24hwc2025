"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cropper, ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

interface NewsImageUploadProps {
  onUploadComplete: (url: string, width?: string) => void;
  allowCrop?: boolean;
}

export function NewsImageUpload({
  onUploadComplete,
  allowCrop = false,
}: NewsImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [selectedWidth, setSelectedWidth] = useState<string>("100%");
  const [showCropDialog, setShowCropDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Välj en bildfil");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Bilden måste vara mindre än 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "news-images");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.details || "Upload misslyckades"
        );
      }

      const data = await response.json();
      setUploadedUrl(data.url);
      if (allowCrop) {
        setShowCropDialog(true);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "Misslyckades att ladda upp bild"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleInsert = async () => {
    if (!uploadedUrl) return;

    setIsUploading(true);
    setError(null);

    try {
      let finalUrl = uploadedUrl;

      // If cropping was used, get the cropped canvas and upload it
      if (allowCrop && showCropDialog && cropperRef.current?.cropper) {
        const canvas = cropperRef.current.cropper.getCroppedCanvas();

        if (canvas) {
          // Convert canvas to blob
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob);
                } else {
                  reject(new Error("Failed to create blob"));
                }
              },
              "image/jpeg",
              0.95
            );
          });

          // Upload cropped image
          const formData = new FormData();
          formData.append("file", blob, "cropped-image.jpg");
          formData.append("bucket", "news-images");

          const response = await fetch("/api/upload/image", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Failed to upload cropped image");
          }

          const data = await response.json();
          finalUrl = data.url;
        }
      }

      onUploadComplete(finalUrl, selectedWidth);

      // Reset
      setUploadedUrl(null);
      setSelectedWidth("100%");
      setShowCropDialog(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Crop/insert error:", err);
      setError(
        err instanceof Error ? err.message : "Misslyckades att beskära bild"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSkipCrop = () => {
    setShowCropDialog(false);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      {!uploadedUrl ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="news-image-upload"
          />
          <Label htmlFor="news-image-upload">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              {isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Laddar upp...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Klicka för att välja bild
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF upp till 5MB
                  </p>
                </div>
              )}
            </div>
          </Label>
        </div>
      ) : showCropDialog && allowCrop ? (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <strong>✂️ Beskär bilden:</strong>
            <ul className="mt-2 space-y-1 text-xs">
              <li>
                🔲 Dra i <strong>handtagen</strong> (hörn och sidor) för att
                ändra storlek
              </li>
              <li>
                🖱️ Dra <strong>inuti rutan</strong> för att flytta beskärningen
              </li>
              <li>
                🔍 Använd <strong>mushjulet</strong> för att zooma
              </li>
            </ul>
          </div>

          {/* Crop Interface with HANDLES! */}
          <div
            className="border rounded-lg overflow-hidden bg-black"
            style={{ height: "400px" }}
          >
            <Cropper
              ref={cropperRef}
              src={uploadedUrl}
              style={{ height: "100%", width: "100%" }}
              aspectRatio={0} // Free-form crop
              guides={true}
              viewMode={1}
              minCropBoxWidth={50}
              minCropBoxHeight={50}
              background={false}
              responsive={true}
              autoCropArea={0.8}
              checkOrientation={false}
              zoomable={true}
              zoomOnWheel={true}
              movable={true}
              scalable={false}
              cropBoxMovable={true}
              cropBoxResizable={true}
              toggleDragModeOnDblclick={false}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSkipCrop}
              variant="outline"
              disabled={isUploading}
            >
              Hoppa över beskärning
            </Button>
            <Button
              onClick={handleInsert}
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Beskär & ladda upp...
                </>
              ) : (
                "✂️ Beskär och fortsätt"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Preview */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium mb-2">Förhandsgranskning:</p>
            <img
              src={uploadedUrl}
              alt="Uploaded preview"
              className="max-w-full h-auto rounded"
              style={{ maxHeight: "300px" }}
            />
          </div>

          {/* Width selector */}
          <div className="space-y-2">
            <Label htmlFor="image-width">Bildbredd i artikeln:</Label>
            <Select value={selectedWidth} onValueChange={setSelectedWidth}>
              <SelectTrigger id="image-width">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100%">Full bredd (100%)</SelectItem>
                <SelectItem value="75%">Stor (75%)</SelectItem>
                <SelectItem value="50%">Medium (50%)</SelectItem>
                <SelectItem value="33%">Liten (33%)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Välj hur bred bilden ska vara i artikeln
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleInsert}
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Laddar upp...
                </>
              ) : (
                "Infoga bild"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setUploadedUrl(null);
                setSelectedWidth("100%");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={isUploading}
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
