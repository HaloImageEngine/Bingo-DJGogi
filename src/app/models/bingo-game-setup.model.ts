export interface BingoGameSetupHeader {
  Game_ID_Checked: number;
  GN_ID_Found: number | null;
  Call_List_ID_Found: number | null;
  Check_Timestamp: string | null;
}

export interface BingoGameSetupGameNightRow {
  Table_Name: string;
  GN_ID: number;
  GN_Name: string | null;
  GN_Date: string | null;
  GN_Venue: string | null;
  GN_HostName: string | null;
  GN_IsActive: boolean | null;
  Status: string | null;
}

export interface BingoGameSetupGameRow {
  Table_Name: string;
  Game_ID: number;
  GN_ID: number | null;
  Game_Number: number | null;
  Game_Name: string | null;
  Game_Status: string | null;
  Game_WinPattern: string | null;
  Game_StartTime: string | null;
  Game_EndTime: string | null;
  Status: string | null;
}

export interface BingoGameSetupCallListMasterRow {
  Table_Name: string;
  Call_List_ID: number;
  Game_ID: number;
  Inning: number;
  Call_List_Name: string | null;
  Call_List_Genre: string | null;
  Call_List_Decade: string | null;
  Call_List_Era: string | null;
  Call_List_SongCount: number | null;
  Call_List_IsActive: boolean | null;
  Status: string | null;
}

export interface BingoGameSetupCallListSongsByInningRow {
  Table_Name: string;
  Inning: number;
  Song_Count: number | null;
  Genre_Count: number | null;
  Decade_Count: number | null;
  First_Song: string | null;
  Last_Song: string | null;
  Explicit_Count: number | null;
}

export interface BingoGameSetupCardsByInningRow {
  Table_Name: string;
  Inning: number;
  Total_Cards: number | null;
  Unique_Card_IDs: number | null;
  Unique_Players: number | null;
  Winner_Count: number | null;
  First_Card_Created: string | null;
  Last_Card_Created: string | null;
}

export interface BingoGameSetupInningComparisonRow {
  Inning: number;
  Has_CallList_Master: string | null;
  Has_Songs: string | null;
  Song_Count: number | null;
  Has_Cards: string | null;
  Card_Count: number | null;
  Inning_Status: string | null;
}

export interface BingoGameSetupOverallSummary {
  Game_ID: number | null;
  GN_ID: number | null;
  Call_List_ID: number | null;
  GameNight_Records: number | null;
  Game_Records: number | null;
  CallList_Master_Innings: number | null;
  Songs_Innings: number | null;
  Cards_Innings: number | null;
  Total_Songs: number | null;
  Total_Cards: number | null;
  Inning_Sync_Status: string | null;
}

export interface BingoGameSetupValidationRow {
  Check_Number: number;
  Component: string | null;
  Status: string | null;
  Message: string | null;
}

export interface BingoGameSetupCheckResult {
  Header: BingoGameSetupHeader;
  GameNightRows: BingoGameSetupGameNightRow[];
  GameRows: BingoGameSetupGameRow[];
  CallListMasterRows: BingoGameSetupCallListMasterRow[];
  CallListSongsByInning: BingoGameSetupCallListSongsByInningRow[];
  CardsByInning: BingoGameSetupCardsByInningRow[];
  InningComparisons: BingoGameSetupInningComparisonRow[];
  OverallSummary: BingoGameSetupOverallSummary;
  ValidationReport: BingoGameSetupValidationRow[];
}
