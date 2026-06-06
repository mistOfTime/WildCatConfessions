export type Category = 'Crushes' | 'Rants' | 'Tea' | 'Memes' | 'Academic' | 'Other';

export interface Reaction {
  heart: number;
  thumbsUp: number;
  laugh: number;
  wow: number;
  sad: number;
}

export interface Comment {
  id: string;
  confessionId: string;
  content: string;
  timestamp: string;
  parentId?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  authorPhoto?: string | null;
  isAnonymous?: boolean;
}

export interface Confession {
  id: string;
  content: string;
  category: Category;
  timestamp: string;
  reactions: Reaction;
  reportCount: number;
  status: 'approved' | 'pending' | 'flagged';
  commentCount: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  isPinned?: boolean;
  isAnonymous?: boolean;
  authorName?: string | null;
  authorId?: string | null;
  authorPhoto?: string | null;
  song?: { title: string; artist: string; artwork: string; previewUrl: string } | null;
}

export interface UserProfile {
  uid: string;
  displayName?: string | null;
  avatarPhoto?: string | null;
  bio?: string | null;
  course?: string | null;
  updatedAt?: string;
}
  song?: { title: string; artist: string; artwork: string; previewUrl: string } | null;
  authorName?: string | null;
  authorId?: string | null;
  authorPhoto?: string | null;
}
