export interface NewsItem {
  id: number;
  title: string;
  content: string;
  published: boolean;
  is_preview_men?: boolean;
  is_preview_women?: boolean;
  preview_url?: string; // External URL for preview articles (e.g., ultramarathon.se)
  created_at: string;
  updated_at: string;
  linkedRunnerIds?: number[]; // Runner IDs linked to this news
}

export interface NewsItemCreate {
  title: string;
  content: string;
  published?: boolean;
  is_preview_men?: boolean;
  is_preview_women?: boolean;
  preview_url?: string;
  runnerIds?: number[]; // Runner IDs to link to this news
}

export interface NewsItemUpdate {
  title?: string;
  content?: string;
  published?: boolean;
  is_preview_men?: boolean;
  is_preview_women?: boolean;
  preview_url?: string;
  runnerIds?: number[]; // Runner IDs to link to this news
}
