"use client";

import * as React from "react";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { enUS, sv } from "date-fns/locale";
import { ChatAuthPrompt } from "@/components/chat/ChatAuthPrompt";

interface Comment {
  id: number;
  news_id: number;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  chat_users: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface NewsCommentsProps {
  newsId: number;
}

export function NewsComments({ newsId }: NewsCommentsProps) {
  const { user, chatUser } = useSupabaseAuth();
  const { t, language } = useLanguage();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [newComment, setNewComment] = React.useState("");
  const [editingCommentId, setEditingCommentId] = React.useState<number | null>(
    null
  );
  const [editingText, setEditingText] = React.useState("");
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);

  const locale = language === "sv" ? sv : enUS;

  // Fetch comments
  React.useEffect(() => {
    fetchComments();
  }, [newsId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/news/${newsId}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setShowAuthPrompt(true);
      return;
    }

    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/news/${newsId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to post comment");
      }

      const data = await response.json();
      setComments([...comments, data.comment]);
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      alert(error instanceof Error ? error.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: number) => {
    if (!editingText.trim()) return;

    try {
      const response = await fetch(
        `/api/news/${newsId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment: editingText }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update comment");
      }

      const data = await response.json();
      setComments(comments.map((c) => (c.id === commentId ? data.comment : c)));
      setEditingCommentId(null);
      setEditingText("");
    } catch (error) {
      console.error("Error updating comment:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update comment"
      );
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!window.confirm(t.news.confirmDeleteComment || "Delete this comment?"))
      return;

    try {
      const response = await fetch(
        `/api/news/${newsId}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete comment"
      );
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        <h2 className="text-xl font-semibold">
          {t.news.comments || "Comments"} ({comments.length})
        </h2>
      </div>

      {/* Auth prompt dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-md w-full">
            <ChatAuthPrompt onClose={() => setShowAuthPrompt(false)} />
          </div>
        </div>
      )}

      {/* Comment form */}
      {user && !chatUser?.is_banned && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t.news.writeComment || "Write a comment..."}
                className="min-h-[100px]"
                maxLength={5000}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {newComment.length}/5000
                </span>
                <Button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t.news.postComment || "Post Comment"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Login prompt */}
      {!user && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground mb-4">
              {t.news.loginToComment || "Sign in to leave a comment"}
            </p>
            <Button onClick={() => setShowAuthPrompt(true)}>
              {t.news.signIn || "Sign In"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Banned notice */}
      {user && chatUser?.is_banned && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-destructive">
              {t.news.bannedFromCommenting || "You are banned from commenting"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t.news.noComments || "No comments yet. Be the first to comment!"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {comment.chat_users.avatar_url && (
                        <AvatarImage src={comment.chat_users.avatar_url} />
                      )}
                      <AvatarFallback>
                        {getInitials(comment.chat_users.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">
                        {comment.chat_users.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale,
                        })}
                        {comment.updated_at !== comment.created_at && (
                          <span className="ml-1">
                            ({t.news.edited || "edited"})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {(user?.id === comment.user_id || chatUser?.is_admin) && (
                    <div className="flex gap-1">
                      {user?.id === comment.user_id &&
                        editingCommentId !== comment.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => startEditing(comment)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      {chatUser?.is_admin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {editingCommentId === comment.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="min-h-[80px]"
                      maxLength={5000}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditComment(comment.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t.news.save || "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t.news.cancel || "Cancel"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
