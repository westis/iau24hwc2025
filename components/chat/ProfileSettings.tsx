"use client";

import * as React from "react";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { Save, Loader2, Key } from "lucide-react";
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
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState("");

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordMessage("Lösenordet måste vara minst 6 tecken");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Lösenorden matchar inte");
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch("/api/chat/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Misslyckades att ändra lösenord");
      }

      setPasswordMessage("Lösenord uppdaterat!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordMessage(
        error instanceof Error ? error.message : "Misslyckades att ändra lösenord"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  if (!chatUser) return null;

  return (
    <div className="p-3 border-b max-h-[calc(100vh-200px)] overflow-y-auto">
      <form onSubmit={handleSave} className="space-y-3">
        <div className="text-center">
          <h3 className="font-semibold text-sm mb-0.5">Redigera profil</h3>
          <p className="text-xs text-muted-foreground">
            Ladda upp en avatar och uppdatera ditt namn
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Profilbild</Label>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            {avatarUrl && (
              <div className="flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="h-16 w-16 rounded-full object-cover border-2 border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0 w-full max-w-[260px]">
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

        <div className="space-y-1.5">
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
            className="h-8 text-sm"
          />
        </div>

        <Button type="submit" size="sm" disabled={saving} className="w-full">
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

      {/* Password Change Section */}
      <form onSubmit={handlePasswordChange} className="space-y-3 mt-4 pt-4 border-t">
        <div className="text-center">
          <h3 className="font-semibold text-sm mb-0.5 flex items-center justify-center gap-2">
            <Key className="h-3.5 w-3.5" />
            Ändra lösenord
          </h3>
          <p className="text-xs text-muted-foreground">
            Minst 6 tecken
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password" className="text-xs">
            Nytt lösenord
          </Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••"
            required
            minLength={6}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password" className="text-xs">
            Bekräfta lösenord
          </Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••"
            required
            minLength={6}
            className="h-8 text-sm"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={changingPassword}
          className="w-full"
          variant="secondary"
        >
          {changingPassword ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Ändrar...
            </>
          ) : (
            <>
              <Key className="mr-2 h-3 w-3" />
              Ändra lösenord
            </>
          )}
        </Button>

        {passwordMessage && (
          <p
            className={`text-xs text-center ${
              passwordMessage.includes("Misslyckades") ||
              passwordMessage.includes("måste") ||
              passwordMessage.includes("matchar")
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {passwordMessage}
          </p>
        )}
      </form>
    </div>
  );
}
