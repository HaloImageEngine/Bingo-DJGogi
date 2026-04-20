export interface Song {
  song_id: number;
  title: string;
  artist: string;
  featured_artist?: string;
  genre?: string;
  subgenre?: string;
  mood?: string;
  tempo?: 'slow' | 'medium' | 'fast' | 'dance';
  bpm?: number;
  release_year?: number;
  decade?: string;
  era?: string;
  bingo_category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  play_count: number;
  duration_seconds?: number;
  active: boolean;
}
