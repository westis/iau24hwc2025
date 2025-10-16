"use client";

import * as React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Loader2 } from "lucide-react";

export function AccountSettings() {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState("");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordMessage(t.chat.passwordMinLength);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage(t.chat.passwordsDoNotMatch);
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
        throw new Error(data.error || t.chat.failedToChangePassword);
      }

      setPasswordMessage(t.chat.passwordUpdated);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch (error) {
      console.error("Error changing password:", error);
      setPasswordMessage(
        error instanceof Error
          ? error.message
          : t.chat.failedToChangePassword
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.chat.settings}</CardTitle>
        <CardDescription>
          {t.chat.manageAccountSettings}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t.chat.changePassword}
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t.chat.newPassword}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.chat.newPasswordPlaceholder}
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.chat.confirmPassword}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.chat.confirmPasswordPlaceholder}
                minLength={6}
                required
              />
            </div>
          </div>

          {passwordMessage && (
            <div className={`text-sm ${passwordMessage.includes(t.chat.failedToChangePassword) || passwordMessage.includes(t.chat.passwordsDoNotMatch) ? "text-destructive" : "text-green-600"}`}>
              {passwordMessage}
            </div>
          )}

          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.chat.updating}
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                {t.chat.changePassword}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

