"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Edit,
  Trash2,
  Instagram,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { RunnerNotesDisplay } from "@/components/runner-notes-display";
import type { RunnerNote } from "@/types/runner-note";
import type { NewsItem } from "@/types/news";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";

interface Performance {
  id: number;
  event_name: string;
  event_date: string;
  distance: number;
  rank: number | null;
  rank_gender?: number | null;
  event_type: string;
}

interface DUVPersonalBest {
  PB: string;
  [year: string]:
    | string
    | {
        Perf: string;
        RankIntNat?: string;
      };
}

interface RunnerProfile {
  id: number;
  entry_id: string;
  firstname: string;
  lastname: string;
  nationality: string;
  gender: string;
  dns?: boolean;
  duv_id: number | null;
  personal_best_all_time: number | null;
  personal_best_all_time_year?: number;
  personal_best_last_3_years: number | null;
  personal_best_last_3_years_year?: number;
  date_of_birth: string | null;
  age: number | null;
  match_status: string;
  performances: Performance[];
  allPBs?: Array<{
    [distance: string]: DUVPersonalBest;
  }>;
  photoUrl?: string | null;
  photoFocalX?: number;
  photoFocalY?: number;
  photoZoom?: number;
  avatarUrl?: string | null;
  bio?: string | null;
  instagramUrl?: string | null;
  stravaUrl?: string | null;
}

export default function RunnerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [runner, setRunner] = useState<RunnerProfile | null>(null);
  const [notes, setNotes] = useState<RunnerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllRaces, setShowAllRaces] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
  const [isSaving, setIsSaving] = useState(false);
  const [isUnmatching, setIsUnmatching] = useState(false);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<RunnerNote | null>(null);
  const [noteForm, setNoteForm] = useState({
    noteText: "",
    newsId: "",
  });
  const [availableNews, setAvailableNews] = useState<NewsItem[]>([]);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  useEffect(() => {
    async function loadRunner() {
      try {
        // Use the dedicated runner endpoint for better performance
        const response = await fetch(`/api/runners/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Runner not found");
          } else {
            throw new Error("Failed to fetch runner");
          }
          setLoading(false);
          return;
        }

        const foundRunner = await response.json();

        // Transform to match the expected structure
        const runnerProfile: RunnerProfile = {
          id: foundRunner.id,
          entry_id: foundRunner.entryId,
          firstname: foundRunner.firstname,
          lastname: foundRunner.lastname,
          nationality: foundRunner.nationality,
          gender: foundRunner.gender,
          dns: foundRunner.dns || false,
          duv_id: foundRunner.duvId,
          personal_best_all_time: foundRunner.personalBestAllTime,
          personal_best_all_time_year: foundRunner.personalBestAllTimeYear,
          personal_best_last_3_years: foundRunner.personalBestLast3Years,
          personal_best_last_3_years_year:
            foundRunner.personalBestLast3YearsYear,
          date_of_birth: foundRunner.dateOfBirth,
          age: foundRunner.age,
          match_status: foundRunner.matchStatus,
          allPBs: foundRunner.allPBs || [],
          photoUrl: foundRunner.photoUrl,
          photoFocalX: foundRunner.photoFocalX || 50,
          photoFocalY: foundRunner.photoFocalY || 50,
          photoZoom: foundRunner.photoZoom || 1.5,
          avatarUrl: foundRunner.avatarUrl,
          bio: foundRunner.bio,
          instagramUrl: foundRunner.instagramUrl,
          stravaUrl: foundRunner.stravaUrl,
          performances: (foundRunner.performanceHistory || []).map(
            (p: any) => ({
              id: p.eventId,
              event_name: p.eventName,
              event_date: p.date,
              distance: p.distance,
              rank: p.rank,
              rank_gender: p.rankGender,
              event_type: p.eventType,
            })
          ),
        };

        console.log("Runner loaded:", {
          name: `${foundRunner.firstname} ${foundRunner.lastname}`,
          hasPerformanceHistory: !!foundRunner.performanceHistory,
          performanceCount: foundRunner.performanceHistory?.length || 0,
          samplePerformance: foundRunner.performanceHistory?.[0],
        });

        setRunner(runnerProfile);

        // Fetch notes for this runner
        try {
          const notesResponse = await fetch(
            `/api/runners/${foundRunner.id}/notes`
          );
          if (notesResponse.ok) {
            const notesData = await notesResponse.json();
            setNotes(notesData.notes || []);
          }
        } catch (notesErr) {
          console.error("Error loading notes:", notesErr);
          // Don't fail the whole page if notes fail to load
        }
      } catch (err) {
        console.error("Error loading runner:", err);
        setError(err instanceof Error ? err.message : "Failed to load runner");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadRunner();
    }
  }, [params.id]);

  function openEditDialog() {
    if (runner) {
      setEditForm({
        firstname: runner.firstname,
        lastname: runner.lastname,
        nationality: runner.nationality,
        gender: runner.gender as "M" | "W",
        dns: runner.dns || false,
        photo_url: runner.photoUrl || null,
        photo_focal_x: runner.photoFocalX || 50,
        photo_focal_y: runner.photoFocalY || 50,
        photo_zoom: runner.photoZoom || 1.5,
        bio: runner.bio || "",
        instagram_url: runner.instagramUrl || "",
        strava_url: runner.stravaUrl || "",
      });
      setIsEditDialogOpen(true);
    }
  }

  function closeEditDialog() {
    setIsEditDialogOpen(false);
    setEditForm({
      firstname: "",
      lastname: "",
      nationality: "",
      gender: "",
      dns: false,
      photo_url: null,
      photo_focal_x: 50,
      photo_focal_y: 50,
      photo_zoom: 1.5,
      bio: "",
      instagram_url: "",
      strava_url: "",
    });
  }

  async function saveEdit() {
    if (!runner) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/runners/${runner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error("Failed to update runner");
      }

      const data = await response.json();

      // Reload the page to show updated data from API
      window.location.reload();
    } catch (err) {
      console.error("Error updating runner:", err);
      alert(err instanceof Error ? err.message : "Failed to update runner");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnmatch() {
    if (!runner || !runner.duv_id) return;

    if (!confirm(t.runnerDetail.unmatchConfirm)) {
      return;
    }

    setIsUnmatching(true);
    try {
      const response = await fetch(`/api/runners/${runner.id}/match`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unmatch runner");
      }

      // Reload the page to show updated data
      window.location.reload();
    } catch (err) {
      console.error("Error unmatching runner:", err);
      alert(err instanceof Error ? err.message : "Failed to unmatch runner");
    } finally {
      setIsUnmatching(false);
    }
  }

  async function openNoteDialog(note?: RunnerNote) {
    // Fetch available news items
    try {
      const response = await fetch("/api/news");
      if (response.ok) {
        const data = await response.json();
        setAvailableNews(data.news || []);
      }
    } catch (err) {
      console.error("Error loading news:", err);
    }

    if (note) {
      setEditingNote(note);
      setNoteForm({
        noteText: note.noteText || "",
        newsId: note.newsId?.toString() || "",
      });
    } else {
      setEditingNote(null);
      setNoteForm({ noteText: "", newsId: "" });
    }
    setIsNoteDialogOpen(true);
  }

  function closeNoteDialog() {
    setIsNoteDialogOpen(false);
    setEditingNote(null);
    setNoteForm({ noteText: "", newsId: "" });
  }

  async function saveNote() {
    if (!runner || (!noteForm.noteText && !noteForm.newsId)) {
      alert("Please provide either note text or select a news item");
      return;
    }

    setIsSavingNote(true);
    try {
      if (editingNote) {
        // Update existing note
        const response = await fetch(`/api/runner-notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteText: noteForm.noteText || null,
            newsId: noteForm.newsId ? parseInt(noteForm.newsId) : null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update note");
        }
      } else {
        // Create new note
        const response = await fetch(`/api/runners/${runner.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteText: noteForm.noteText || null,
            newsId: noteForm.newsId ? parseInt(noteForm.newsId) : null,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create note");
        }
      }

      // Reload notes
      const notesResponse = await fetch(`/api/runners/${runner.id}/notes`);
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        setNotes(notesData.notes || []);
      }

      closeNoteDialog();
    } catch (err) {
      console.error("Error saving note:", err);
      alert(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function deleteNote(noteId: number) {
    if (!confirm(t.runners.confirmDeleteNote)) {
      return;
    }

    try {
      const response = await fetch(`/api/runner-notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      // Reload notes
      if (runner) {
        const notesResponse = await fetch(`/api/runners/${runner.id}/notes`);
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes(notesData.notes || []);
        }
      }
    } catch (err) {
      console.error("Error deleting note:", err);
      alert(err instanceof Error ? err.message : "Failed to delete note");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {t.runnerDetail.loadingProfile}
          </p>
        </div>
      </div>
    );
  }

  if (error || !runner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">
            {t.runnerDetail.error}: {error || t.runnerDetail.runnerNotFound}
          </p>
          <Button onClick={() => router.push("/runners")}>
            {t.runnerDetail.backToRunners}
          </Button>
        </div>
      </div>
    );
  }

  // Filter out splits and deduplicate by date
  const filterPerformances = (perfs: Performance[]) => {
    // First, filter out events with "split" or "Split" in the name
    const nonSplits = perfs.filter(
      (p) => !p.event_name.toLowerCase().includes("split")
    );

    // Group by date and keep only one per date (prefer non-combined events)
    const byDate = new Map<string, Performance>();
    for (const perf of nonSplits) {
      const existing = byDate.get(perf.event_date);
      if (!existing) {
        byDate.set(perf.event_date, perf);
      } else {
        // Prefer events without "combined" or "all races" in the name
        const isCombined =
          perf.event_name.toLowerCase().includes("combined") ||
          perf.event_name.toLowerCase().includes("all races");
        const existingIsCombined =
          existing.event_name.toLowerCase().includes("combined") ||
          existing.event_name.toLowerCase().includes("all races");

        if (existingIsCombined && !isCombined) {
          byDate.set(perf.event_date, perf);
        }
      }
    }

    return Array.from(byDate.values());
  };

  const filteredPerformances = filterPerformances(runner.performances);
  const performances24h = filteredPerformances.filter(
    (p) => p.event_type === "24h"
  );
  const displayedPerformances = showAllRaces
    ? filteredPerformances
    : performances24h;

  // Helper to determine if event is time-based (where result is distance) or distance-based (where result is time/laps)
  const isTimeBased = (eventType: string) => {
    const timeBasedEvents = ["24h", "6h", "12h", "48h", "6d", "10d"];
    return timeBasedEvents.some((type) =>
      eventType.toLowerCase().includes(type)
    );
  };

  // Format seconds as h:mm:ss
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Decode HTML entities in event names
  const decodeHTML = (html: string): string => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  // Extract PBs from allPBs data (from DUV)
  const getPBFromAllPBs = (
    distanceKey: string
  ): { distance: number; year: number } | null => {
    if (!runner.allPBs || runner.allPBs.length === 0) return null;

    const pbData = runner.allPBs.find((pb) => pb[distanceKey]);
    if (!pbData || !pbData[distanceKey]) return null;

    const distancePB = pbData[distanceKey];
    const pbValue = parseFloat(distancePB.PB);
    if (isNaN(pbValue)) return null;

    // Find the year when PB was set
    const yearKeys = Object.keys(distancePB).filter(
      (k) => k !== "PB" && !isNaN(parseInt(k))
    );
    let pbYear: number | undefined;

    for (const year of yearKeys) {
      const yearData = distancePB[year];
      if (typeof yearData === "object" && yearData.Perf) {
        const perfValue = parseFloat(yearData.Perf);
        if (!isNaN(perfValue) && Math.abs(perfValue - pbValue) < 0.01) {
          pbYear = parseInt(year);
          break;
        }
      }
    }

    return {
      distance: pbValue,
      year:
        pbYear ||
        parseInt(yearKeys[yearKeys.length - 1]) ||
        new Date().getFullYear(),
    };
  };

  const pb6h = getPBFromAllPBs("6h");
  const pb12h = getPBFromAllPBs("12h");
  const pb48h = getPBFromAllPBs("48h");
  const hasOtherPBs = pb6h || pb12h || pb48h;

  return (
    <main className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => router.push("/participants?view=individual")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.runnerDetail.backToRunners}
        </Button>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Runner Photo Avatar - Use pre-cropped avatarUrl */}
              {(runner.avatarUrl || runner.photoUrl) && (
                <div
                  className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-border flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setIsAvatarDialogOpen(true)}
                >
                  <Image
                    src={runner.avatarUrl || runner.photoUrl!}
                    alt={`${runner.firstname} ${runner.lastname}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                    quality={100}
                  />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">
                  {runner.firstname} {runner.lastname}
                </h1>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={openEditDialog}>
                <Pencil className="h-4 w-4 mr-2" />
                {t.runnerDetail.edit}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">{runner.nationality}</Badge>
            <Badge variant="outline">
              {runner.gender === "M"
                ? t.runnerDetail.men
                : t.runnerDetail.women}
            </Badge>
            {(runner.age || runner.date_of_birth) && (
              <Badge variant="outline">
                {runner.age && `${t.runnerDetail.age} ${runner.age}`}
                {runner.age && runner.date_of_birth && " • "}
                {runner.date_of_birth &&
                  `${t.runnerDetail.yob} ${new Date(
                    runner.date_of_birth
                  ).getFullYear()}`}
              </Badge>
            )}
          </div>

          {/* Social Links */}
          {(runner.duv_id || runner.instagramUrl || runner.stravaUrl) && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {runner.duv_id && (
                <a
                  href={`https://statistik.d-u-v.org/getresultperson.php?runner=${runner.duv_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>DUV</span>
                </a>
              )}
              {runner.instagramUrl && (
                <a
                  href={runner.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent transition-colors"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  <span>Instagram</span>
                </a>
              )}
              {runner.stravaUrl && (
                <a
                  href={runner.stravaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-accent transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  <span>Strava</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Bio Section */}
        {runner.bio && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-2">About</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {runner.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Notes Section */}
        {(notes.length > 0 || isAdmin) && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t.runners.notes}</CardTitle>
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openNoteDialog()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t.runners.addNote}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.runners.noNotes}
                </p>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="relative bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3"
                    >
                      {isAdmin && (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNoteDialog(note)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNote(note.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {note.noteText && (
                        <p className="text-sm text-foreground pr-16">
                          {note.noteText}
                        </p>
                      )}
                      {note.newsItem && (
                        <div
                          className={
                            note.noteText
                              ? "mt-2 pt-2 border-t border-blue-200 dark:border-blue-800"
                              : ""
                          }
                        >
                          <a
                            href={`/news/${note.newsItem.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span className="text-xs font-medium">
                              {t.runners.linkedNews}:
                            </span>
                            <span className="text-xs">
                              {note.newsItem.title}
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div
          className={`grid gap-6 ${
            hasOtherPBs ? "grid-cols-2" : "md:grid-cols-1 max-w-2xl"
          } mb-6`}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">
                {t.runnerDetail.personalBests}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-4">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t.runnerDetail.allTimePB}
                  </p>
                  <p className="text-base md:text-2xl font-bold text-primary">
                    {runner.personal_best_all_time ? (
                      <>
                        {runner.personal_best_all_time.toFixed(3)} km
                        {runner.personal_best_all_time_year && (
                          <span className="text-xs md:text-base text-muted-foreground ml-2">
                            ({runner.personal_best_all_time_year})
                          </span>
                        )}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {t.runnerDetail.pb20232025}
                  </p>
                  <p className="text-base md:text-2xl font-bold text-primary">
                    {runner.personal_best_last_3_years ? (
                      <>
                        {runner.personal_best_last_3_years.toFixed(3)} km
                        {runner.personal_best_last_3_years_year && (
                          <span className="text-xs md:text-base text-muted-foreground ml-2">
                            ({runner.personal_best_last_3_years_year})
                          </span>
                        )}
                      </>
                    ) : (
                      "N/A"
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {hasOtherPBs && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">
                  {t.runnerDetail.otherPBs}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 md:space-y-4">
                  {pb6h && (
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {t.runnerDetail.pb6h}
                      </p>
                      <p className="text-base md:text-2xl font-bold text-primary">
                        {pb6h.distance.toFixed(3)} km
                        <span className="text-xs md:text-base text-muted-foreground ml-2">
                          ({pb6h.year})
                        </span>
                      </p>
                    </div>
                  )}
                  {pb12h && (
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {t.runnerDetail.pb12h}
                      </p>
                      <p className="text-base md:text-2xl font-bold text-primary">
                        {pb12h.distance.toFixed(3)} km
                        <span className="text-xs md:text-base text-muted-foreground ml-2">
                          ({pb12h.year})
                        </span>
                      </p>
                    </div>
                  )}
                  {pb48h && (
                    <div>
                      <p className="text-xs md:text-sm text-muted-foreground">
                        {t.runnerDetail.pb48h}
                      </p>
                      <p className="text-base md:text-2xl font-bold text-primary">
                        {pb48h.distance.toFixed(3)} km
                        <span className="text-xs md:text-base text-muted-foreground ml-2">
                          ({pb48h.year})
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {t.runnerDetail.raceHistory || "Race History"} -{" "}
              {showAllRaces ? t.runnerDetail.allRaces : t.runnerDetail.only24h}
            </CardTitle>
            <div className="flex items-center justify-between mt-3">
              <p className="text-sm text-muted-foreground">
                {displayedPerformances.length} {t.runnerDetail.races}
              </p>
              <div
                className="inline-flex rounded-lg border border-input bg-background p-1"
                role="group"
              >
                <Button
                  variant={!showAllRaces ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowAllRaces(false)}
                  className={!showAllRaces ? "" : "hover:bg-accent"}
                >
                  {t.runnerDetail.only24h}
                </Button>
                <Button
                  variant={showAllRaces ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowAllRaces(true)}
                  className={showAllRaces ? "" : "hover:bg-accent"}
                >
                  {t.runnerDetail.allRaces}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {displayedPerformances.length === 0 ? (
              <p className="text-muted-foreground">
                {t.runnerDetail.noRaceHistory}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1 md:px-4">
                        {t.runnerDetail.date}
                      </th>
                      <th className="text-left py-2 px-1 md:px-4">
                        {t.runnerDetail.event}
                      </th>
                      {showAllRaces && (
                        <th className="text-left py-2 px-1 md:px-4">
                          {t.runnerDetail.type}
                        </th>
                      )}
                      <th className="text-right py-2 px-1 md:px-4">
                        {t.runnerDetail.result}
                      </th>
                      <th className="text-right py-2 px-1 md:px-4">
                        <div className="flex flex-col">
                          <span>{t.runnerDetail.rank}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({t.runnerDetail.gender})
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPerformances.map((perf) => {
                      const timeBased = isTimeBased(perf.event_type);
                      return (
                        <tr key={perf.id} className="border-b hover:bg-accent">
                          <td className="py-2 px-1 md:px-4 text-sm">
                            {perf.event_date
                              ? new Date(perf.event_date).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="py-2 px-1 md:px-4 text-sm">
                            {decodeHTML(perf.event_name)}
                          </td>
                          {showAllRaces && (
                            <td className="py-2 px-1 md:px-4 text-sm">
                              <Badge variant="outline" className="text-xs">
                                {perf.event_type || t.runnerDetail.unknown}
                              </Badge>
                            </td>
                          )}
                          <td className="py-2 px-1 md:px-4 text-sm text-right font-medium">
                            {timeBased
                              ? // For time-based events, distance is the result in km
                                `${perf.distance.toFixed(3)} km`
                              : // For distance-based events, format as time (h:mm:ss)
                                formatTime(perf.distance)}
                          </td>
                          <td className="py-2 px-1 md:px-4 text-sm text-right">
                            {perf.rank_gender || perf.rank || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => !open && closeEditDialog()}
        >
          <DialogContent className="max-h-[90vh] flex flex-col max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.runnerDetail.editRunner}</DialogTitle>
              <DialogDescription>
                {t.runnerDetail.editDescription}
              </DialogDescription>
            </DialogHeader>

            <Tabs
              defaultValue="basic"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="profile">Profile & Social</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2 pt-4">
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="firstname">
                      {t.runnerDetail.firstName}
                    </Label>
                    <Input
                      id="firstname"
                      value={editForm.firstname}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstname: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastname">{t.runnerDetail.lastName}</Label>
                    <Input
                      id="lastname"
                      value={editForm.lastname}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastname: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nationality">
                      {t.runnerDetail.nationality}
                    </Label>
                    <Input
                      id="nationality"
                      value={editForm.nationality}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          nationality: e.target.value.toUpperCase(),
                        })
                      }
                      maxLength={3}
                      placeholder={t.runnerDetail.nationalityPlaceholder}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">{t.runnerDetail.gender}</Label>
                    <Select
                      value={editForm.gender}
                      onValueChange={(value: "M" | "W") =>
                        setEditForm({ ...editForm, gender: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t.runnerDetail.selectGender}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="W">W</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="dns"
                      checked={editForm.dns}
                      onCheckedChange={(checked) =>
                        setEditForm({ ...editForm, dns: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="dns"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {t.runnerDetail.dns}: {t.runnerDetail.dnsDescription}
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="profile" className="space-y-4 mt-0">
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
                      onUploadComplete={(url, path, focalPoint, zoom) => {
                        console.log(
                          "Focal point and zoom set:",
                          focalPoint,
                          zoom
                        );
                        setEditForm({
                          ...editForm,
                          photo_url: url,
                          photo_focal_x: focalPoint.x,
                          photo_focal_y: focalPoint.y,
                          photo_zoom: zoom,
                        });
                      }}
                      onDelete={() =>
                        setEditForm({ ...editForm, photo_url: null })
                      }
                      label="Upload Runner Photo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio / Description</Label>
                    <Textarea
                      id="bio"
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bio: e.target.value })
                      }
                      placeholder="Enter runner bio or description"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagram_url">Instagram URL</Label>
                    <Input
                      id="instagram_url"
                      value={editForm.instagram_url}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          instagram_url: e.target.value,
                        })
                      }
                      placeholder="https://instagram.com/username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strava_url">Strava URL</Label>
                    <Input
                      id="strava_url"
                      value={editForm.strava_url}
                      onChange={(e) =>
                        setEditForm({ ...editForm, strava_url: e.target.value })
                      }
                      placeholder="https://strava.com/athletes/123456"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                {runner?.duv_id && (
                  <Button
                    variant="destructive"
                    onClick={handleUnmatch}
                    disabled={isSaving || isUnmatching}
                  >
                    {isUnmatching
                      ? t.runnerDetail.unmatching
                      : t.runnerDetail.unmatch}
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={closeEditDialog}
                  disabled={isSaving || isUnmatching}
                >
                  {t.runnerDetail.cancel}
                </Button>
                <Button onClick={saveEdit} disabled={isSaving || isUnmatching}>
                  {isSaving
                    ? t.runnerDetail.saving
                    : t.runnerDetail.saveChanges}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notes Dialog */}
        <Dialog
          open={isNoteDialogOpen}
          onOpenChange={(open) => !open && closeNoteDialog()}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingNote ? t.runners.editNote : t.runners.addNote}
              </DialogTitle>
              <DialogDescription>
                {editingNote
                  ? "Edit the note for this runner"
                  : "Add a note for this runner"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="noteText">{t.runners.noteText}</Label>
                <Textarea
                  id="noteText"
                  value={noteForm.noteText}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, noteText: e.target.value })
                  }
                  placeholder="Enter note text (optional)"
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newsId">{t.runners.linkedNews}</Label>
                <Select
                  value={noteForm.newsId || "0"}
                  onValueChange={(value) =>
                    setNoteForm({
                      ...noteForm,
                      newsId: value === "0" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a news item (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">None</SelectItem>
                    {availableNews.map((news) => (
                      <SelectItem key={news.id} value={news.id.toString()}>
                        {news.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeNoteDialog}
                disabled={isSavingNote}
              >
                {t.runners.cancel}
              </Button>
              <Button onClick={saveNote} disabled={isSavingNote}>
                {isSavingNote ? t.runners.saving : t.runners.saveChanges}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Avatar Dialog */}
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {runner.firstname} {runner.lastname}
              </DialogTitle>
            </DialogHeader>
            {runner.photoUrl && (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `scale(${runner.photoZoom || 1.5})`,
                    transformOrigin: `${runner.photoFocalX || 50}% ${
                      runner.photoFocalY || 50
                    }%`,
                  }}
                >
                  <Image
                    src={runner.photoUrl}
                    alt={`${runner.firstname} ${runner.lastname}`}
                    fill
                    className="object-cover"
                    style={{
                      objectPosition: `${runner.photoFocalX || 50}% ${
                        runner.photoFocalY || 50
                      }%`,
                    }}
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
