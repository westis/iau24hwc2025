"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  Pin,
  Circle,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import type { RaceUpdate, RaceUpdateComment, RaceUpdateCategory } from "@/types/live-race";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ChatAuthPrompt } from "@/components/chat/ChatAuthPrompt";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";

interface RaceUpdateCardProps {
  update: RaceUpdate;
  onMarkAsRead?: (updateId: number) => void;
  isRead?: boolean;
  onDelete?: (updateId: number) => void;
}

interface InstagramEmbedProps {
  url: string;
}

function InstagramEmbed({ url }: InstagramEmbedProps) {
  const embedRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Load Instagram embed script
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;

    script.onload = () => {
      // Process embeds after script loads
      if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process();
        setIsLoading(false);
      }
    };

    script.onerror = () => {
      setError(true);
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Clean up script if needed
      const existingScript = document.querySelector(
        'script[src="https://www.instagram.com/embed.js"]'
      );
      if (existingScript && document.body.contains(existingScript)) {
        // Don't remove - might be used by other embeds
      }
    };
  }, []);

  // Re-process when URL changes
  React.useEffect(() => {
    if ((window as any).instgrm && embedRef.current) {
      (window as any).instgrm.Embeds.process();
    }
  }, [url]);

  if (error) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          View on Instagram →
        </a>
      </div>
    );
  }

  return (
    <div ref={embedRef} className="w-full flex justify-center">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: "3px",
          boxShadow: "0 0 1px 0 rgba(0,0,0,0.5),0 1px 10px 0 rgba(0,0,0,0.15)",
          margin: "1px",
          maxWidth: "540px",
          minWidth: "326px",
          padding: 0,
          width: "calc(100% - 2px)",
        }}
      >
        <a href={url} target="_blank" rel="noopener noreferrer">
          View this post on Instagram
        </a>
      </blockquote>
    </div>
  );
}

export function RaceUpdateCard({ update, onMarkAsRead, isRead = false, onDelete }: RaceUpdateCardProps) {
  const { user, chatUser } = useSupabaseAuth();
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const locale = language === "sv" ? sv : enUS;

  const [comments, setComments] = React.useState<RaceUpdateComment[]>([]);
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [showComments, setShowComments] = React.useState(false);
  const [newComment, setNewComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null);
  const [editingText, setEditingText] = React.useState("");
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const cardRef = React.useRef<HTMLDivElement>(null);

  // Mark as read when scrolled into view
  React.useEffect(() => {
    if (!onMarkAsRead) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onMarkAsRead(update.id);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [update.id, onMarkAsRead]);

  // Fetch comments when expanded
  React.useEffect(() => {
    if (showComments && comments.length === 0) {
      fetchComments();
    }
  }, [showComments]);

  async function fetchComments() {
    try {
      setLoadingComments(true);
      const res = await fetch(`/api/race/updates/${update.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/race/updates/${update.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to post comment");
      }

      const data = await res.json();
      setComments([...comments, data.comment]);
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      alert(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditComment(commentId: number) {
    if (!editingText.trim()) return;

    try {
      const res = await fetch(`/api/race/updates/${update.id}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: editingText }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update comment");
      }

      const data = await res.json();
      setComments(comments.map((c) => (c.id === commentId ? data.comment : c)));
      setEditingCommentId(null);
      setEditingText("");
    } catch (error) {
      console.error("Error updating comment:", error);
      alert(error instanceof Error ? error.message : "Failed to update comment");
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!window.confirm(t.news?.confirmDeleteComment || "Delete this comment?")) return;

    try {
      const res = await fetch(`/api/race/updates/${update.id}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert(error instanceof Error ? error.message : "Failed to delete comment");
    }
  }

  async function handleDeleteUpdate() {
    if (!window.confirm("Är du säker på att du vill radera denna uppdatering?")) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/race/updates/${update.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete update");
      }

      if (onDelete) {
        onDelete(update.id);
      }
    } catch (error) {
      console.error("Error deleting update:", error);
      alert(error instanceof Error ? error.message : "Misslyckades med att radera uppdatering");
    } finally {
      setDeleting(false);
    }
  }

  function handleEditUpdate() {
    // Navigate to edit page with update ID
    router.push(`/admin/race-updates/edit/${update.id}`);
  }

  function getCategoryBadge(category?: RaceUpdateCategory) {
    const categoryColors: Record<RaceUpdateCategory, string> = {
      urgent: "bg-red-500 text-white",
      summary: "bg-blue-500 text-white",
      team_sweden: "bg-yellow-500 text-black",
      interview: "bg-purple-500 text-white",
      general: "bg-gray-500 text-white",
    };

    const categoryLabels: Record<RaceUpdateCategory, string> = {
      urgent: t.live?.urgent || "Urgent",
      summary: t.live?.summary || "Summary",
      team_sweden: t.live?.teamSweden || "Team Sweden",
      interview: t.live?.interview || "Interview",
      general: t.live?.general || "General",
    };

    if (!category) return null;

    return (
      <Badge className={categoryColors[category]}>
        {categoryLabels[category]}
      </Badge>
    );
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <>
      <Card
        ref={cardRef}
        className={`overflow-hidden ${!isRead && onMarkAsRead ? 'border-l-4 border-l-blue-500' : ''} ${update.isSticky ? 'bg-primary/5 border-2 border-primary/50' : ''}`}
      >
        {/* Sticky post banner */}
        {update.isSticky && (
          <div className="bg-primary/20 border-b border-primary/30 px-4 py-2 flex items-center gap-2">
            <Pin className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Fäst inlägg - Fler inlägg nedan
            </span>
          </div>
        )}

        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap items-center">
              {!isRead && onMarkAsRead && (
                <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />
              )}
              {getCategoryBadge(update.category)}
              {update.priority === "high" && (
                <Badge variant="destructive" className="text-xs py-0">{t.live?.high || "High"}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs text-muted-foreground whitespace-nowrap"
                title={new Date(update.timestamp).toLocaleString('sv-SE', {
                  timeZone: 'Europe/Stockholm',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              >
                {formatDistanceToNow(new Date(update.timestamp), {
                  addSuffix: true,
                  locale,
                })}
              </span>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleEditUpdate}
                    title="Redigera uppdatering"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={handleDeleteUpdate}
                    disabled={deleting}
                    title="Radera uppdatering"
                  >
                    {deleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-2 px-4 pb-3">
          {/* Media Content */}
          {update.mediaType === "audio" && update.mediaUrl && (
            <audio controls className="w-full">
              <source src={update.mediaUrl} />
              Your browser does not support the audio element.
            </audio>
          )}

          {update.mediaType === "video" && update.mediaUrl && (
            <div className="flex justify-center">
              {update.mediaUrl.includes("youtube.com") ||
              update.mediaUrl.includes("youtu.be") ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden w-full md:max-w-2xl lg:max-w-3xl">
                  <iframe
                    src={update.mediaUrl.replace("watch?v=", "embed/")}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="bg-black rounded-lg overflow-hidden w-full md:max-w-2xl lg:max-w-3xl">
                  <video
                    controls
                    className="w-full h-auto max-h-[70vh]"
                    style={{
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto'
                    }}
                    playsInline
                  >
                    <source src={update.mediaUrl} />
                    Your browser does not support the video element.
                  </video>
                </div>
              )}
            </div>
          )}

          {(update.mediaType === "image" || update.mediaType === "text_image") &&
            update.mediaUrl && (
              <img
                src={update.mediaUrl}
                alt={update.mediaDescription || "Race update image"}
                className="w-full rounded-lg"
              />
            )}

          {update.mediaType === "instagram" && update.mediaUrl && (
            <InstagramEmbed url={update.mediaUrl} />
          )}

          {/* Media Credit */}
          {update.mediaCredit && update.mediaType !== "text" && (
            <p className="text-xs text-muted-foreground italic flex items-center gap-1">
              Foto:
              {update.mediaCreditUrl ? (
                <a
                  href={update.mediaCreditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  {update.mediaCredit}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span>{update.mediaCredit}</span>
              )}
            </p>
          )}

          {/* Description/Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="whitespace-pre-wrap">
              {update.contentSv || update.content}
            </p>
          </div>

          {/* Comments Section */}
          {update.allowComments !== false && (
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="w-full justify-between"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t.news?.comments || "Comments"} ({update.commentCount || 0})
                </span>
                {showComments ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>

              {showComments && (
                <div className="mt-4 space-y-4">
                  {/* Comment form */}
                  {user && !chatUser?.is_banned && (
                    <form onSubmit={handleSubmitComment} className="space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={t.news?.writeComment || "Write a comment..."}
                        className="min-h-[80px]"
                        maxLength={5000}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          {newComment.length}/5000
                        </span>
                        <Button type="submit" size="sm" disabled={submitting || !newComment.trim()}>
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          {t.news?.postComment || "Post"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Login prompt */}
                  {!user && (
                    <div className="text-center py-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">
                        {t.news?.loginToComment || "Sign in to leave a comment"}
                      </p>
                      <Button size="sm" onClick={() => setShowAuthPrompt(true)}>
                        {t.news?.signIn || "Sign In"}
                      </Button>
                    </div>
                  )}

                  {/* Comments list */}
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t.news?.noComments || "No comments yet"}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="border rounded-lg p-3 bg-muted/30"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                {comment.chatUsers.avatarUrl && (
                                  <AvatarImage src={comment.chatUsers.avatarUrl} />
                                )}
                                <AvatarFallback className="text-xs">
                                  {getInitials(comment.chatUsers.displayName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-xs">
                                  {comment.chatUsers.displayName}
                                </p>
                                <p
                                  className="text-xs text-muted-foreground"
                                  title={new Date(comment.createdAt).toLocaleString('sv-SE', {
                                    timeZone: 'Europe/Stockholm',
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                >
                                  {formatDistanceToNow(new Date(comment.createdAt), {
                                    addSuffix: true,
                                    locale,
                                  })}
                                  {comment.updatedAt !== comment.createdAt && (
                                    <span className="ml-1">
                                      ({t.news?.edited || "edited"})
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {(user?.id === comment.userId || chatUser?.is_admin) && (
                              <div className="flex gap-1">
                                {user?.id === comment.userId &&
                                  editingCommentId !== comment.id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingText(comment.comment);
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                {chatUser?.is_admin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          {editingCommentId === comment.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="min-h-[60px]"
                                maxLength={5000}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditComment(comment.id)}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  {t.news?.save || "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCommentId(null);
                                    setEditingText("");
                                  }}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  {t.news?.cancel || "Cancel"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">
                              {comment.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auth prompt dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full">
            <ChatAuthPrompt onClose={() => setShowAuthPrompt(false)} />
          </div>
        </div>
      )}
    </>
  );
}
