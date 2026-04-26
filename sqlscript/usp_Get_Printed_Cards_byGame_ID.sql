USE [haloimag_djgogi]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE OR ALTER PROCEDURE [dbo].[usp_Get_Printed_Cards_byGame_ID]
    @Game_ID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    SELECT
        c.Card_ID AS CardID,
        c.Game_ID AS GameID,
        g.GN_ID AS GNID,
        g.Game_Number AS GameNumber,
        g.Game_Name AS GameName,
        g.Game_WinPattern AS GameWinPattern,
        c.Card_Date_Create AS CardDateCreate,
        c.Card_PlayerName AS CardPlayerName,
        c.Card_PlayerEmail AS CardPlayerEmail,
        c.PlayCount AS PlayCount,
        c.Card_IsWinner AS CardIsWinner,
        c.Card_SeedKey AS CardSeedKey,
        c.Card_PrintedAt AS CardPrintedAt,
        sq.SquareCode AS SquareCode,
        sq.SquarePosition AS SquarePosition,
        sq.ColumnLetter AS ColumnLetter,
        sq.RowNumber AS RowNumber,
        sq.SongID AS SongID,
        s.title AS SongTitle,
        s.artist AS SongArtist,
        sq.IsCalled AS IsCalled,
        CAST(CASE WHEN sq.SquareCode = 'N3' THEN 1 ELSE 0 END AS bit) AS IsFreeSpace
    FROM dbo.Cards c
    INNER JOIN dbo.Game g ON g.Game_ID = c.Game_ID
    CROSS APPLY
    (
        VALUES
            ('B1',  1, 'B', 1, c.Sq_B1, c.Sq_B1_Called),
            ('I1',  2, 'I', 1, c.Sq_I1, c.Sq_I1_Called),
            ('N1',  3, 'N', 1, c.Sq_N1, c.Sq_N1_Called),
            ('G1',  4, 'G', 1, c.Sq_G1, c.Sq_G1_Called),
            ('O1',  5, 'O', 1, c.Sq_O1, c.Sq_O1_Called),
            ('B2',  6, 'B', 2, c.Sq_B2, c.Sq_B2_Called),
            ('I2',  7, 'I', 2, c.Sq_I2, c.Sq_I2_Called),
            ('N2',  8, 'N', 2, c.Sq_N2, c.Sq_N2_Called),
            ('G2',  9, 'G', 2, c.Sq_G2, c.Sq_G2_Called),
            ('O2', 10, 'O', 2, c.Sq_O2, c.Sq_O2_Called),
            ('B3', 11, 'B', 3, c.Sq_B3, c.Sq_B3_Called),
            ('I3', 12, 'I', 3, c.Sq_I3, c.Sq_I3_Called),
            ('N3', 13, 'N', 3, c.Sq_N3, c.Sq_N3_Called),
            ('G3', 14, 'G', 3, c.Sq_G3, c.Sq_G3_Called),
            ('O3', 15, 'O', 3, c.Sq_O3, c.Sq_O3_Called),
            ('B4', 16, 'B', 4, c.Sq_B4, c.Sq_B4_Called),
            ('I4', 17, 'I', 4, c.Sq_I4, c.Sq_I4_Called),
            ('N4', 18, 'N', 4, c.Sq_N4, c.Sq_N4_Called),
            ('G4', 19, 'G', 4, c.Sq_G4, c.Sq_G4_Called),
            ('O4', 20, 'O', 4, c.Sq_O4, c.Sq_O4_Called),
            ('B5', 21, 'B', 5, c.Sq_B5, c.Sq_B5_Called),
            ('I5', 22, 'I', 5, c.Sq_I5, c.Sq_I5_Called),
            ('N5', 23, 'N', 5, c.Sq_N5, c.Sq_N5_Called),
            ('G5', 24, 'G', 5, c.Sq_G5, c.Sq_G5_Called),
            ('O5', 25, 'O', 5, c.Sq_O5, c.Sq_O5_Called)
    ) sq(SquareCode, SquarePosition, ColumnLetter, RowNumber, SongID, IsCalled)
    LEFT JOIN dbo.songs s ON s.song_id = sq.SongID
    WHERE c.Game_ID = @Game_ID
    ORDER BY c.Card_ID, sq.SquarePosition;
END;
GO
