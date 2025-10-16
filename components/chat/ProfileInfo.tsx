"use client";

import * as React from "react";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/ImageUpload";
import { Save, Loader2 } from "lucide-react";
import type { Area } from "react-easy-crop";

export function ProfileInfo() {
  const { chatUser, refreshChatUser } = useSupabaseAuth();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = React.useState(
    chatUser?.display_name || ""
  );
  const [avatarUrl, setAvatarUrl] = React.useState(chatUser?.avatar_url || "");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (chatUser) {
      setDisplayName(chatUser.display_name);
      // Add timestamp to avatar URL to force refresh after updates
      const url = chatUser.avatar_url || "";
      setAvatarUrl(url ? `${url}?t=${Date.now()}` : "");
    }
  }, [chatUser]);

  const handleAvatarUpload = (
    url: string,
    path: string,
    focalPoint: { x: number; y: number },
    zoom: number,
    cropPosition?: { x: number; y: number },
    cropAreaPixels?: Area | null
  ) => {
    // ImageUpload already adds timestamp, just save it
    setAvatarUrl(url);
    // Save clean URL to database (remove timestamp)
    const cleanUrl = url.split("?")[0];
    saveProfile(displayName, cleanUrl);
  };

  const handleAvatarDelete = () => {
    setAvatarUrl("");
    saveProfile(displayName, "");
  };

  const saveProfile = async (name: string, avatar: string) => {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/chat/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: name,
          avatar_url: avatar || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      await refreshChatUser();
      setMessage(t.chat.profileUpdated);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage(t.chat.failedToUpdateProfile);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(displayName, avatarUrl);
  };

  if (!chatUser) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.chat.profile}</CardTitle>
        <CardDescription>{t.chat.updateProfilePicture}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <ImageUpload
              bucket="chat-avatars"
              currentImageUrl={avatarUrl}
              onUploadComplete={handleAvatarUpload}
              onDelete={handleAvatarDelete}
              cropShape="round"
              aspectRatio={1}
              label={t.chat.uploadAvatar}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">{t.chat.displayName}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.chat.displayNamePlaceholder}
              required
            />
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.includes(t.chat.failedToUpdateProfile)
                  ? "text-destructive"
                  : "text-green-600"
              }`}
            >
              {message}
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.chat.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t.chat.saveChanges}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
