export interface BingoGameActionResult {
  Success: boolean;
  GameID: number;
  CallListID?: number | null;
  Inning?: number | null;
  ReturnValue: number;
}

export interface BingoTopCard {
  CardID: number;
  CalledCount: number;
}

export interface BingoWinnerResult {
  GameID: number;
  /** Present when API returns `Check_ForWinner/{Game}/{CallList}/{Inning}/{NumOfSongsCalled}` payload. */
  CallListID?: number | null;
  Inning?: number | null;
  WinningCardID: number | null;
  WinningPattern: string | null;
  PlayerName: string | null;
  PlayerEmail: string | null;
  WinningLineCount?: number | null;
  NumOfSongsCalled?: number | null;
  Result: string | null;
}

/**
 * Path/query mapping for `Upsert_CallList_Winner`:
 * `{Game_ID}/{Call_List_ID}/{Inning}/{Call_List_WinningCard}/{NumofSongsCalled}?winningPattern={Call_List_WinningPattern}`
 */
export interface BingoUpsertCallListWinnerParams {
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Call_List_WinningCard: number;
  Call_List_WinningPattern: string;
  NumofSongsCalled: number;
}

/**
 * Response from `Upsert_CallList_Winner/{Game_ID}/{Call_List_ID}/{Inning}/{Call_List_WinningCard}/{NumofSongsCalled}?winningPattern=…`
 * Maps to `CallList_Winner`: Game_ID, Call_List_ID, Inning, Call_List_WinningCard, Call_List_WinningPattern, NumofSongsCalled.
 */
export interface BingoUpsertCallListWinnerResult {
  Message: string;
}

export interface BingoCalledSong {
  SongID: number;
  SongTitle: string;
  SongArtist: string;
}

/** One row inside `BingoSongsCalledCalculateByGci.CalledSongs`. */
export interface BingoCalledSongFromGci {
  Inning: number;
  Call_List_ID: number;
  song_id: number;
  title: string;
  artist: string;
  DateTimeStamp: string | null;
  ThisNumberAWinner: string;
}

/** GET …/Get_Songs_Called_Calculate_by_GCI/{Game_ID}/{Call_List_ID}/{Inning} */
export interface BingoSongsCalledCalculateByGci {
  SongsCalled: number;
  TotalSongs: number;
  SongsRemaining: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  CalledSongs?: BingoCalledSongFromGci[];
}

type BingoCardCol = 'B' | 'I' | 'N' | 'G' | 'O';
type BingoCardRow = 1 | 2 | 3 | 4 | 5;

/** Song id on one square (free center may be `null`). */
export type BingoMaxGameCardSquareSongKey = {
  [C in BingoCardCol]: { [R in BingoCardRow]: `Sq_${C}${R}` }[BingoCardRow];
}[BingoCardCol];

export type BingoMaxGameCardSquareCalledKey = `${BingoMaxGameCardSquareSongKey}_Called`;

export type BingoMaxGameCardSquareFields = {
  [K in BingoMaxGameCardSquareSongKey]: number | null;
} & {
  [K in BingoMaxGameCardSquareCalledKey]: boolean;
};

/** Card header from GET …/Get_MaxGameCard_FirstCard/{Game_ID}/{Call_List_ID}/{Inning} */
export interface BingoMaxGameCardHeader {
  Card_ID: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Card_Date_Create: string | null;
  Card_PlayerName: string | null;
  Card_PlayerEmail: string | null;
  PlayCount: number;
  Card_IsWinner: boolean;
  Card_SeedKey: string | null;
  Card_PrintedAt: string | null;
}

/** Full first-card payload including all BINGO square song ids and called flags. */
export type BingoMaxGameCardFirstCard = BingoMaxGameCardHeader & BingoMaxGameCardSquareFields;

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
  InningNumber: number | null;
}

export interface BingoCallListSongInsert {
  CallListID: number;
  Inning: number;
  Song_ID: number;
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
  NewSongID?: number;
}

export interface BingoCallListSong {
  song_id: number;
  Call_List_ID: number;
  inning: number | null;
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

export interface BingoCallListSongByGci {
  Inning: number;
  Call_List_ID: number;
  song_id: number;
  title: string;
  artist: string;
  genre: string | null;
  release_year: number | null;
  decade: string | null;
  era: string | null;
  last_played: string | null;
}

/** `GET …/Get_Call_List_Songs_by4Inning/{Game_ID}/{Call_List_ID}` */
export interface BingoCallListSongsBy4Inning {
  Inning1: BingoCallListSong[];
  Inning2: BingoCallListSong[];
  Inning3: BingoCallListSong[];
  Inning4: BingoCallListSong[];
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
