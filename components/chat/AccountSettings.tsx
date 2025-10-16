"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Key, Loader2, Trash2 } from "lucide-react";

export function AccountSettings() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [changingPassword, setChangingPassword] = React.useState(false);
  const [passwordMessage, setPasswordMessage] = React.useState("");
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

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
        error instanceof Error ? error.message : t.chat.failedToChangePassword
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const expectedText = language === "sv" ? "RADERA" : "DELETE";
    if (deleteConfirmText !== expectedText) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch("/api/chat/delete-account", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t.chat.failedToDeleteAccount);
      }

      // Account deleted successfully, redirect to home
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      alert(t.chat.failedToDeleteAccount);
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.chat.settings}</CardTitle>
        <CardDescription>{t.chat.manageAccountSettings}</CardDescription>
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
            <div
              className={`text-sm ${
                passwordMessage.includes(t.chat.failedToChangePassword) ||
                passwordMessage.includes(t.chat.passwordsDoNotMatch)
                  ? "text-destructive"
                  : "text-green-600"
              }`}
            >
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

        <div className="mt-8 pt-8 border-t border-destructive/20">
          <h3 className="text-lg font-medium text-destructive dark:text-red-400 flex items-center gap-2 mb-4">
            <Trash2 className="h-5 w-5" />
            {t.chat.deleteAccount}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t.chat.deleteAccountWarning}
          </p>

          <AlertDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t.chat.deleteAccount}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.chat.deleteAccount}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t.chat.deleteAccountWarning}
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor="delete-confirm">
                  {t.chat.typeDeleteToConfirm}
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={language === "sv" ? "RADERA" : "DELETE"}
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
                  {t.common.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={
                    deleteConfirmText !==
                      (language === "sv" ? "RADERA" : "DELETE") || deleting
                  }
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.chat.deleting}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.chat.deleteAccount}
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
