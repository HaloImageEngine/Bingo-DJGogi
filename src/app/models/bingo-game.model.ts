export interface BingoGameActionResult {
  Success: boolean;
  GameID: number;
  ReturnValue: number;
}

export interface BingoTopCard {
  CardID: number;
  CalledCount: number;
}

export interface BingoWinnerResult {
  GameID: number;
  WinningCardID: number | null;
  WinningPattern: string | null;
  PlayerName: string | null;
  PlayerEmail: string | null;
  Result: string | null;
}

export interface BingoCalledSong {
  SongID: number;
  SongTitle: string;
  SongArtist: string;
}

export interface BingoCallListMaster {
  Call_List_ID: number;
  Call_List_Name: string;
  Call_List_Date: string | null;
  Call_List_Description: string | null;
  Call_List_Genre: string | null;
  Call_List_Decade: string | null;
  Call_List_Era: string | null;
  Call_List_SongCount: number;
  Call_List_IsActive: boolean;
  Call_List_CreatedAt: string | null;
  Call_List_UpdatedAt: string | null;
}

export interface BingoCallListCreate {
  NewCallListID: number | null;
  CallListName: string;
  CallListDate: string;
  CallListDescription: string;
  GameID: number | null;
  CallListGenre: string;
  CallListDecade: string;
  CallListEra: string;
  CallListSongCount: number;
  CallListIsActive: boolean;
  CallListCreatedAt: string | null;
  CallListID: number | null;
}

export interface BingoCallListSongInsert {
  CallListID: number;
  Title: string;
  Artist: string;
  FeaturedArtist: string;
  LeadVocalist: string;
  ArtistType: string;
  Genre: string;
  Explicit: boolean;
  ReleaseYear: number;
  Decade: string;
  Era: string;
  LastPlayed: string;
  NewSongID: number;
}

export interface BingoCallListSong {
  song_id: number;
  Call_List_ID: number;
  title: string;
  artist: string;
  featured_artist: string | null;
  lead_vocalist: string | null;
  artist_type: string | null;
  genre: string | null;
  explicit: boolean;
  release_year: number | null;
  decade: string | null;
  era: string | null;
  last_played: string | null;
}

export interface CallListBuildResult {
  master: BingoCallListMaster;
  songs: BingoCallListSong[];
}

export interface BingoInsertGameGameNight {
  GN_Name: string;
  GN_Date: string;
  GN_Venue: string;
  Game_Number: number;
  Game_Name: string;
}

export interface BingoInsertGameGameNightResult {
  NewGN_ID: number;
}
