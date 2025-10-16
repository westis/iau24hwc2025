"use client";

import * as React from "react";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      setAvatarUrl(chatUser.avatar_url || "");
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
    setAvatarUrl(url);
    // Auto-save when avatar is uploaded
    saveProfile(displayName, url);
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
      setMessage("Profile updated!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Failed to update profile");
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
        <CardDescription>
          Update your profile picture and display name
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <ImageUpload
              bucket="chat-avatars"
              currentImageUrl={avatarUrl}
              onUploadComplete={handleAvatarUpload}
              onDelete={handleAvatarDelete}
              cropShape="round"
              aspectRatio={1}
              label="Upload Avatar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              required
            />
          </div>

          {message && (
            <div className={`text-sm ${message.includes("Failed") ? "text-destructive" : "text-green-600"}`}>
              {message}
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

