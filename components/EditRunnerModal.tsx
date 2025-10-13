"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUpload } from "@/components/ImageUpload";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface EditRunnerModalProps {
  runnerId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditRunnerModal({
  runnerId,
  isOpen,
  onClose,
  onSaved,
}: EditRunnerModalProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstname: "",
    lastname: "",
    nationality: "",
    gender: "" as "M" | "W" | "",
    dns: false,
    photo_url: "" as string | null,
    photo_focal_x: 50,
    photo_focal_y: 50,
    photo_zoom: 1.5,
    bio: "",
    instagram_url: "",
    strava_url: "",
  });

  // Load runner data when modal opens
  useEffect(() => {
    if (isOpen && runnerId) {
      loadRunnerData();
    }
  }, [isOpen, runnerId]);

  async function loadRunnerData() {
    if (!runnerId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/runners/${runnerId}`);
      if (!response.ok) throw new Error("Failed to fetch runner");

      const runner = await response.json();
      setEditForm({
        firstname: runner.firstname || "",
        lastname: runner.lastname || "",
        nationality: runner.nationality || "",
        gender: runner.gender || "",
        dns: runner.dns || false,
        photo_url: runner.photoUrl || null,
        photo_focal_x: runner.photoFocalX || 50,
        photo_focal_y: runner.photoFocalY || 50,
        photo_zoom: runner.photoZoom || 1.5,
        bio: runner.bio || "",
        instagram_url: runner.instagramUrl || "",
        strava_url: runner.stravaUrl || "",
      });
    } catch (err) {
      console.error("Error loading runner:", err);
      alert("Failed to load runner data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!runnerId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/runners/${runnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: editForm.firstname,
          lastname: editForm.lastname,
          nationality: editForm.nationality,
          gender: editForm.gender,
          dns: editForm.dns,
          photo_url: editForm.photo_url,
          photo_focal_x: editForm.photo_focal_x,
          photo_focal_y: editForm.photo_focal_y,
          photo_zoom: editForm.photo_zoom,
          photo_crop_x: editForm.photo_crop_x,
          photo_crop_y: editForm.photo_crop_y,
          bio: editForm.bio,
          instagram_url: editForm.instagram_url,
          strava_url: editForm.strava_url,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update runner");
      }

      if (onSaved) {
        onSaved();
      } else {
        // Reload the page to show updated data
        window.location.reload();
      }
      onClose();
    } catch (err) {
      console.error("Error updating runner:", err);
      alert(err instanceof Error ? err.message : "Failed to update runner");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.runners.editRunner}</DialogTitle>
          <DialogDescription>{t.runners.editDescription}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto"></div>
          </div>
        ) : (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="profile">Profile & Social</TabsTrigger>
            </TabsList>

            <div className="py-4">
              <TabsContent value="basic" className="space-y-4 mt-0">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstname">
                      {t.runners.firstName}
                    </Label>
                    <Input
                      id="edit-firstname"
                      value={editForm.firstname}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstname: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-lastname">{t.runners.lastName}</Label>
                    <Input
                      id="edit-lastname"
                      value={editForm.lastname}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastname: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-nationality">
                      {t.runners.nationality}
                    </Label>
                    <Input
                      id="edit-nationality"
                      value={editForm.nationality}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          nationality: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={3}
                      placeholder={t.runners.nationalityPlaceholder}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-gender">{t.runners.gender}</Label>
                    <Select
                      value={editForm.gender}
                      onValueChange={(value: "M" | "W") =>
                        setEditForm({ ...editForm, gender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.runners.selectGender} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="W">W</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* DNS Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-dns"
                    checked={editForm.dns}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, dns: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="edit-dns"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t.runners.dnsDescription}
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="space-y-4 mt-0">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label className="block">Runner Photo</Label>
                  <ImageUpload
                    bucket="runner-photos"
                    currentImageUrl={editForm.photo_url}
                    currentFocalPoint={{
                      x: editForm.photo_focal_x,
                      y: editForm.photo_focal_y,
                    }}
                    currentZoom={editForm.photo_zoom}
                    currentCrop={
                      editForm.photo_crop_x !== undefined && editForm.photo_crop_y !== undefined
                        ? { x: editForm.photo_crop_x, y: editForm.photo_crop_y }
                        : undefined
                    }
                    onUploadComplete={(url, path, focalPoint, zoom, cropPosition) => {
                      setEditForm({
                        ...editForm,
                        photo_url: url,
                        photo_focal_x: focalPoint.x,
                        photo_focal_y: focalPoint.y,
                        photo_zoom: zoom,
                        photo_crop_x: cropPosition?.x,
                        photo_crop_y: cropPosition?.y,
                      });
                    }}
                    onDelete={() => {
                      setEditForm({
                        ...editForm,
                        photo_url: null,
                        photo_focal_x: 50,
                        photo_focal_y: 50,
                        photo_crop_x: 0,
                        photo_crop_y: 0,
                        photo_zoom: 1.5,
                      });
                    }}
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="edit-bio">Bio</Label>
                  <Textarea
                    id="edit-bio"
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    rows={3}
                    placeholder="Runner bio..."
                  />
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-instagram">Instagram URL</Label>
                    <Input
                      id="edit-instagram"
                      type="url"
                      value={editForm.instagram_url}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          instagram_url: e.target.value,
                        })
                      }
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-strava">Strava URL</Label>
                    <Input
                      id="edit-strava"
                      type="url"
                      value={editForm.strava_url}
                      onChange={(e) =>
                        setEditForm({ ...editForm, strava_url: e.target.value })
                      }
                      placeholder="https://strava.com/athletes/..."
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t.runners.cancel}
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? t.runners.saving : t.runners.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
