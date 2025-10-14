"use client";

import * as React from "react";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { Save, Loader2 } from "lucide-react";
import type { Area } from "react-easy-crop";

export function ProfileSettings() {
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
      setMessage("Profil uppdaterad!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Misslyckades att uppdatera profil");
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
    <div className="p-4 border-b max-h-[calc(100vh-300px)] overflow-y-auto">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="text-center">
          <h3 className="font-semibold text-sm mb-1">Redigera profil</h3>
          <p className="text-xs text-muted-foreground">
            Ladda upp en avatar och uppdatera ditt namn
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Profilbild</Label>
          <div className="flex items-start gap-4">
            {avatarUrl && (
              <div className="flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-full object-cover border-2 border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <ImageUpload
                bucket="chat-avatars"
                currentImageUrl={avatarUrl}
                onUploadComplete={handleAvatarUpload}
                onDelete={handleAvatarDelete}
                label="Ladda upp avatar"
                aspectRatio={1}
                cropShape="round"
                hidePreview={true}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name" className="text-xs">
            Visningsnamn
          </Label>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ditt namn"
            required
            maxLength={50}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-3 w-3" />
                Spara namn
              </>
            )}
          </Button>
        </div>

        {message && (
          <p
            className={`text-xs text-center ${
              message.includes("Misslyckades")
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
