// Chat type definitions
export interface ChatUser {
  id: string;
  display_name: string;
  avatar_url?: string;
  is_banned: boolean;
  is_admin: boolean;
  banned_at?: string;
  banned_by?: string;
  ban_reason?: string;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  user_id: string;
  message: string;
  created_at: string;
  deleted_at?: string;
  deleted_by?: string;
  user?: ChatUser;
}

export interface ChatMessageCreate {
  message: string;
}

export interface BanUserRequest {
  reason?: string;
}
