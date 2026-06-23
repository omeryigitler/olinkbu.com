export type Platform = 'youtube' | 'spotify';

export type ReactionCounts = {
  lightbulb: number;
  deep: number;
  fire: number;
  inspire: number;
};

export interface Snippet {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  videoUrl: string;
  videoId: string;
  platform: Platform;
  startSec: number;
  endSec: number;
  comment: string;
  category: string;
  likesCount: number;
  reactions: ReactionCounts;
  createdAt: unknown;
}
