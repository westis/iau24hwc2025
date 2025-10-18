"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Upload,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Video,
  Music,
  Instagram as InstagramIcon,
  FileText,
  X,
  ArrowLeft,
} from "lucide-react";
import type { RaceUpdateCategory, RaceUpdateMediaType, RaceUpdate } from "@/types/live-race";

export default function EditRaceUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [updateId, setUpdateId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState<RaceUpdateCategory>("general");
  const [mediaType, setMediaType] = React.useState<RaceUpdateMediaType>("text");
  const [content, setContent] = React.useState("");
  const [contentSv, setContentSv] = React.useState("");
  const [showEnglishField, setShowEnglishField] = React.useState(false);
  const [mediaUrl, setMediaUrl] = React.useState("");
  const [mediaDescription, setMediaDescription] = React.useState("");
  const [mediaCredit, setMediaCredit] = React.useState("");
  const [mediaCreditUrl, setMediaCreditUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [allowComments, setAllowComments] = React.useState(true);
  const [isSticky, setIsSticky] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Unwrap params and fetch update data
  React.useEffect(() => {
    async function loadUpdate() {
      try {
        const unwrappedParams = await params;
        const id = unwrappedParams.id;
        setUpdateId(id);

        const res = await fetch(`/api/race/updates/${id}`);
        if (!res.ok) {
          throw new Error("Failed to load update");
        }

        const data = await res.json();
        const update: RaceUpdate = data.update;

        // Pre-populate form
        setCategory(update.category || "general");
        setMediaType(update.mediaType || "text");
        setContentSv(update.contentSv || "");
        setContent(update.content || "");
        setShowEnglishField(!!(update.content && update.content !== update.contentSv));
        setMediaUrl(update.mediaUrl || "");
        setMediaDescription(update.mediaDescription || "");
        setMediaCredit(update.mediaCredit || "");
        setMediaCreditUrl(update.mediaCreditUrl || "");
        setAllowComments(update.allowComments !== false);
        setIsSticky(update.isSticky || false);
        setLoading(false);
      } catch (err) {
        console.error("Error loading update:", err);
        setError(err instanceof Error ? err.message : "Failed to load update");
        setLoading(false);
      }
    }

    loadUpdate();
  }, [params]);

  // Redirect if not admin
  React.useEffect(() => {
    if (!isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, router]);

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes: Record<RaceUpdateMediaType, string[]> = {
      text: [],
      audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"],
      video: ["video/mp4", "video/webm", "video/ogg"],
      image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      instagram: [],
      text_image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    };

    if (
      mediaType !== "text" &&
      mediaType !== "instagram" &&
      !validTypes[mediaType].includes(file.type)
    ) {
      setError(`Ogiltig filtyp för ${mediaType}. Vänligen välj en giltig fil.`);
      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/media", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Uppladdning misslyckades");
      }

      const data = await res.json();
      setMediaUrl(data.url);
      setError("");
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Misslyckades med att ladda upp fil. Försök igen."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!contentSv.trim()) {
      setError("Innehåll på svenska krävs");
      return;
    }

    if (!updateId) {
      setError("Update ID saknas");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`/api/race/updates/${updateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim() || contentSv, // Use Swedish as fallback for English if not provided
          contentSv: contentSv,
          priority: category === "urgent" ? "high" : "medium",
          category,
          mediaType,
          mediaUrl: mediaUrl || undefined,
          mediaDescription: mediaDescription || undefined,
          mediaCredit: mediaCredit || undefined,
          mediaCreditUrl: mediaCreditUrl || undefined,
          allowComments,
          isSticky,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Misslyckades med att uppdatera");
      }

      // Success!
      setSuccess(true);

      // Navigate back after 1 second
      setTimeout(() => {
        router.push("/live/updates");
      }, 1000);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : "Misslyckades med att uppdatera");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryLabels: Record<RaceUpdateCategory, string> = {
    urgent: "Brådskande",
    summary: "Sammanfattning",
    team_sweden: "Team Sverige",
    interview: "Intervju",
    general: "Allmänt",
  };

  const categoryColors: Record<RaceUpdateCategory, string> = {
    urgent: "bg-red-500",
    summary: "bg-blue-500",
    team_sweden: "bg-yellow-500",
    interview: "bg-purple-500",
    general: "bg-gray-500",
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <MessageSquare className="h-8 w-8" />
                Redigera uppdatering
              </h1>
              <p className="text-muted-foreground">
                Uppdatera befintlig loppuppdatering
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push("/live/updates")}>
            Visa uppdateringar
          </Button>
        </div>

        {/* Success/Error messages */}
        {success && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Uppdatering sparad! Omdirigerar...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-950">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Redigera uppdatering</CardTitle>
              <CardDescription>
                Uppdatera mediatyp, innehåll och inställningar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Category selection */}
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <Badge
                      key={key}
                      className={`cursor-pointer ${
                        category === key
                          ? categoryColors[key as RaceUpdateCategory]
                          : "bg-muted text-muted-foreground"
                      }`}
                      onClick={() => setCategory(key as RaceUpdateCategory)}
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Media type tabs */}
              <div className="space-y-2">
                <Label>Mediatyp *</Label>
                <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as RaceUpdateMediaType)}>
                  <TabsList className="grid grid-cols-5 w-full">
                    <TabsTrigger value="text">
                      <FileText className="h-4 w-4 mr-1" />
                      Text
                    </TabsTrigger>
                    <TabsTrigger value="image">
                      <ImageIcon className="h-4 w-4 mr-1" />
                      Bild
                    </TabsTrigger>
                    <TabsTrigger value="audio">
                      <Music className="h-4 w-4 mr-1" />
                      Ljud
                    </TabsTrigger>
                    <TabsTrigger value="video">
                      <Video className="h-4 w-4 mr-1" />
                      Video
                    </TabsTrigger>
                    <TabsTrigger value="instagram">
                      <InstagramIcon className="h-4 w-4 mr-1" />
                      Instagram
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* File upload or URL input */}
              {mediaType !== "text" && (
                <div className="space-y-2">
                  <Label>
                    {mediaType === "instagram" ? "Instagram-URL" : "Ladda upp fil"}
                  </Label>
                  {mediaType === "instagram" ? (
                    <Input
                      type="url"
                      placeholder="https://www.instagram.com/p/..."
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {uploading ? "Laddar upp..." : "Ladda upp fil"}
                        </Button>
                        <Input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileUpload}
                          accept={
                            mediaType === "audio"
                              ? "audio/*"
                              : mediaType === "video"
                              ? "video/*"
                              : "image/*"
                          }
                        />
                        {mediaUrl && (
                          <span className="flex items-center text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Uppladdad
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Eller klistra in en YouTube/Vimeo-URL för video
                      </p>
                      <Input
                        type="url"
                        placeholder="Eller klistra in URL här..."
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Content (Swedish) - PRIMARY */}
              <div className="space-y-2">
                <Label htmlFor="contentSv">Content (Svenska) *</Label>
                <Textarea
                  id="contentSv"
                  placeholder="Skriv din uppdatering här..."
                  value={contentSv}
                  onChange={(e) => setContentSv(e.target.value)}
                  className="min-h-[120px]"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {contentSv.length}/2000
                </p>
              </div>

              {/* Add English translation (optional) */}
              {!showEnglishField ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEnglishField(true)}
                >
                  + Lägg till engelsk översättning (valfritt)
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Innehåll (English) - Valfritt</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowEnglishField(false);
                        setContent("");
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ta bort
                    </Button>
                  </div>
                  <Textarea
                    id="content"
                    placeholder="Write your update in English..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[120px]"
                    maxLength={2000}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {content.length}/2000
                  </p>
                </div>
              )}

              {/* Media description */}
              {mediaType !== "text" && (
                <div className="space-y-2">
                  <Label htmlFor="mediaDescription">
                    Mediabeskrivning (för tillgänglighet)
                  </Label>
                  <Input
                    id="mediaDescription"
                    placeholder="Beskriv mediainnehållet..."
                    value={mediaDescription}
                    onChange={(e) => setMediaDescription(e.target.value)}
                  />
                </div>
              )}

              {/* Media credit */}
              {mediaType !== "text" && (
                <div className="space-y-2">
                  <Label htmlFor="mediaCredit">
                    Fotograf/Källa (valfritt)
                  </Label>
                  <Input
                    id="mediaCredit"
                    placeholder="t.ex. @instagramhandle, Namn Efternamn, etc."
                    value={mediaCredit}
                    onChange={(e) => setMediaCredit(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kreditera fotografen eller källan för bild/video
                  </p>
                </div>
              )}

              {/* Media credit URL */}
              {mediaType !== "text" && mediaCredit && (
                <div className="space-y-2">
                  <Label htmlFor="mediaCreditUrl">
                    Instagram/Profil-URL (valfritt)
                  </Label>
                  <Input
                    id="mediaCreditUrl"
                    type="url"
                    placeholder="https://instagram.com/username"
                    value={mediaCreditUrl}
                    onChange={(e) => setMediaCreditUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Länk till fotografens Instagram eller profil
                  </p>
                </div>
              )}

              {/* Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowComments" className="cursor-pointer">
                    Tillåt kommentarer
                  </Label>
                  <Switch
                    id="allowComments"
                    checked={allowComments}
                    onCheckedChange={setAllowComments}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="isSticky" className="cursor-pointer">
                    Fäst högst upp (sticky)
                  </Label>
                  <Switch
                    id="isSticky"
                    checked={isSticky}
                    onCheckedChange={setIsSticky}
                  />
                </div>
              </div>

              {/* Submit button */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="flex-1"
                >
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || uploading || !contentSv.trim()}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? "Sparar..." : "Spara ändringar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
