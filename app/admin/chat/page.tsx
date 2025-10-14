"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useSupabaseAuth } from "@/lib/auth/supabase-auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Users,
  Ban,
  Trash2,
  UserCheck,
  Loader2,
  Shield,
} from "lucide-react";
import { useMessages, useBanUser } from "@/lib/hooks/useChat";
import type { ChatUser, ChatMessage } from "@/types/chat";
import { createClient } from "@/lib/supabase/client";

export default function AdminChatPage() {
  const router = useRouter();
  const { isAdmin: isOldAdmin } = useAuth();
  const { isAdmin: isChatAdmin, loading: authLoading } = useSupabaseAuth();
  const { messages, loading: messagesLoading } = useMessages(true);
  const { banUser, unbanUser } = useBanUser();

  const [users, setUsers] = React.useState<ChatUser[]>([]);
  const [loadingUsers, setLoadingUsers] = React.useState(true);
  const [banReason, setBanReason] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState<string | null>(null);
  const supabase = createClient();

  // Fetch all chat users
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_users")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching users:", error);
        } else {
          setUsers(data as ChatUser[]);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isChatAdmin) {
      fetchUsers();
    }
  }, [isChatAdmin, supabase]);

  // Require both old admin and chat admin
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOldAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Site Admin Login Required
            </CardTitle>
            <CardDescription>
              You must log in as site admin first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/admin")} className="w-full">
              Go to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isChatAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <MessageSquare className="h-5 w-5" />
              Chat Login Required
            </CardTitle>
            <CardDescription>
              You&apos;re logged in as site admin, but you also need to log in
              to chat to manage messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-semibold mb-2">Why do I need both?</p>
              <p className="text-muted-foreground">
                Chat uses Supabase authentication. To delete messages or ban
                users, you need to be logged in to the chat system with an admin
                account.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => router.push("/chat/login")}
                className="flex-1"
              >
                Login to Chat
              </Button>
              <Button
                onClick={() => router.push("/admin")}
                variant="outline"
                className="flex-1"
              >
                Back to Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm("Delete this message?")) return;

    try {
      const response = await fetch(`/api/chat/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete message");
      }

      alert("Message deleted successfully");
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message");
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!window.confirm("Ban this user from chat?")) return;

    try {
      await banUser(userId, banReason || undefined);
      setBanReason("");
      setSelectedUser(null);
      alert("User banned successfully");

      // Refresh users
      const { data } = await supabase
        .from("chat_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setUsers(data as ChatUser[]);
    } catch (error) {
      console.error("Error banning user:", error);
      alert("Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!window.confirm("Unban this user?")) return;

    try {
      await unbanUser(userId);
      alert("User unbanned successfully");

      // Refresh users
      const { data } = await supabase
        .from("chat_users")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setUsers(data as ChatUser[]);
    } catch (error) {
      console.error("Error unbanning user:", error);
      alert("Failed to unban user");
    }
  };

  const bannedUsers = users.filter((u) => u.is_banned);
  const activeUsers = users.filter((u) => !u.is_banned);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          Chat Moderation
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage chat messages and users
        </p>
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages ({messages.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users ({activeUsers.length})
          </TabsTrigger>
          <TabsTrigger value="banned" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Banned ({bannedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>
                Monitor and delete inappropriate messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {messages
                    .slice()
                    .reverse()
                    .map((message: ChatMessage) => (
                      <div
                        key={message.id}
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">
                              {message.user?.display_name || "Unknown"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(message.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm break-words">
                            {message.message}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMessage(message.id)}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>Manage user access to chat</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : activeUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No active users
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {activeUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined:{" "}
                          {new Date(user.created_at).toLocaleDateString()}
                        </p>
                        {user.is_admin && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {selectedUser === user.id ? (
                          <div className="flex gap-2 items-center">
                            <Input
                              placeholder="Ban reason (optional)"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              className="w-48"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleBanUser(user.id)}
                            >
                              Confirm Ban
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(null);
                                setBanReason("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setSelectedUser(user.id)}
                            disabled={user.is_admin}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            Ban User
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banned">
          <Card>
            <CardHeader>
              <CardTitle>Banned Users</CardTitle>
              <CardDescription>Users who are banned from chat</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : bannedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No banned users
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {bannedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20"
                    >
                      <div>
                        <p className="font-semibold">{user.display_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Banned:{" "}
                          {user.banned_at
                            ? new Date(user.banned_at).toLocaleString()
                            : "Unknown"}
                        </p>
                        {user.ban_reason && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Reason: {user.ban_reason}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnbanUser(user.id)}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Unban
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
