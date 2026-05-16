/** Row from `GET …/Get_Game_Winners_Results/{Game_ID}`. */
export interface BingoGameWinnerResultRow {
  Call_List_Winner_ID: number;
  Game_ID: number;
  Call_List_ID: number;
  Inning: number;
  Call_List_WinningCard: number;
  Call_List_WinningPatter: string | null;
  Call_List_CreatedAt: string | null;
  Call_List_UpdatedAt: string | null;
  NumofSongsCalled: number | null;
}
