USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_CheckForWinner]    Script Date: 4/24/2026 3:33:39 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- Stored Procedure : dbo.usp_CheckForWinner
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Checks all 200 bingo cards for a given game against all
--   12 standard winning patterns after each song is called.
--   If a winner is found, the card is auto-flagged, the Game
--   record is updated to Complete, and the winner details are
--   returned. If no winner is found, a 'No winner yet' result
--   is returned and the game continues.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The Game to check. Must exist in
--                        -- the Game table.


ALTER PROCEDURE [dbo].[usp_CheckForWinner]
    @Game_ID  INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validate Game exists
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.Game WHERE Game_ID = @Game_ID)
    BEGIN
        RAISERROR('Game_ID %d does not exist.', 16, 1, @Game_ID);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Check all 12 winning patterns, return first winner only
    ------------------------------------------------------------
    DECLARE @WinningCardID INT = NULL;
    DECLARE @WinningPattern VARCHAR(50) = NULL;

    SELECT TOP 1
        @WinningCardID  = Card_ID,
        @WinningPattern = WinPattern
    FROM dbo.Cards
    CROSS APPLY
    (
        VALUES
        -- ── 5 Rows ──────────────────────────────────────────
        ('Row 1', CASE WHEN Sq_B1_Called=1 AND Sq_I1_Called=1 AND Sq_N1_Called=1 AND Sq_G1_Called=1 AND Sq_O1_Called=1 THEN 1 ELSE 0 END),
        ('Row 2', CASE WHEN Sq_B2_Called=1 AND Sq_I2_Called=1 AND Sq_N2_Called=1 AND Sq_G2_Called=1 AND Sq_O2_Called=1 THEN 1 ELSE 0 END),
        ('Row 3', CASE WHEN Sq_B3_Called=1 AND Sq_I3_Called=1 AND Sq_N3_Called=1 AND Sq_G3_Called=1 AND Sq_O3_Called=1 THEN 1 ELSE 0 END),
        ('Row 4', CASE WHEN Sq_B4_Called=1 AND Sq_I4_Called=1 AND Sq_N4_Called=1 AND Sq_G4_Called=1 AND Sq_O4_Called=1 THEN 1 ELSE 0 END),
        ('Row 5', CASE WHEN Sq_B5_Called=1 AND Sq_I5_Called=1 AND Sq_N5_Called=1 AND Sq_G5_Called=1 AND Sq_O5_Called=1 THEN 1 ELSE 0 END),

        -- ── 5 Columns ────────────────────────────────────────
        ('Col B', CASE WHEN Sq_B1_Called=1 AND Sq_B2_Called=1 AND Sq_B3_Called=1 AND Sq_B4_Called=1 AND Sq_B5_Called=1 THEN 1 ELSE 0 END),
        ('Col I', CASE WHEN Sq_I1_Called=1 AND Sq_I2_Called=1 AND Sq_I3_Called=1 AND Sq_I4_Called=1 AND Sq_I5_Called=1 THEN 1 ELSE 0 END),
        ('Col N', CASE WHEN Sq_N1_Called=1 AND Sq_N2_Called=1 AND Sq_N3_Called=1 AND Sq_N4_Called=1 AND Sq_N5_Called=1 THEN 1 ELSE 0 END),
        ('Col G', CASE WHEN Sq_G1_Called=1 AND Sq_G2_Called=1 AND Sq_G3_Called=1 AND Sq_G4_Called=1 AND Sq_G5_Called=1 THEN 1 ELSE 0 END),
        ('Col O', CASE WHEN Sq_O1_Called=1 AND Sq_O2_Called=1 AND Sq_O3_Called=1 AND Sq_O4_Called=1 AND Sq_O5_Called=1 THEN 1 ELSE 0 END),

        -- ── 2 Diagonals ──────────────────────────────────────
        ('Diag TL-BR', CASE WHEN Sq_B1_Called=1 AND Sq_I2_Called=1 AND Sq_N3_Called=1 AND Sq_G4_Called=1 AND Sq_O5_Called=1 THEN 1 ELSE 0 END),
        ('Diag TR-BL', CASE WHEN Sq_O1_Called=1 AND Sq_G2_Called=1 AND Sq_N3_Called=1 AND Sq_I4_Called=1 AND Sq_B5_Called=1 THEN 1 ELSE 0 END)

    ) AS Patterns (WinPattern, IsWin)
    WHERE Game_ID = @Game_ID
    AND   Card_IsWinner = 0        -- skip already flagged winners
    AND   IsWin = 1
    ORDER BY Card_ID;              -- lowest Card_ID wins if tie

    ------------------------------------------------------------
    -- If a winner was found, auto-flag the card and update Game
    ------------------------------------------------------------
    IF @WinningCardID IS NOT NULL
    BEGIN
        -- Flag the winning card
        UPDATE dbo.Cards
        SET    Card_IsWinner = 1
        WHERE  Card_ID = @WinningCardID;

        -- Update Game with the winning card
        UPDATE dbo.Game
        SET    Game_WinnerCard_ID = @WinningCardID,
               Game_Status        = 'Complete',
               Game_EndTime       = SYSDATETIME()
        WHERE  Game_ID = @Game_ID;

        -- Return winner details
        SELECT
            @Game_ID            AS Game_ID,
            @WinningCardID      AS Winning_Card_ID,
            @WinningPattern     AS Winning_Pattern,
            c.Card_PlayerName   AS Player_Name,
            c.Card_PlayerEmail  AS Player_Email,
            'BINGO!'            AS Result
        FROM dbo.Cards c
        WHERE c.Card_ID = @WinningCardID;
    END
    ELSE
    BEGIN
        -- No winner yet
        SELECT
            @Game_ID        AS Game_ID,
            NULL            AS Winning_Card_ID,
            NULL            AS Winning_Pattern,
            NULL            AS Player_Name,
            NULL            AS Player_Email,
            'No winner yet' AS Result;
    END;

END;


-- ============================================================
-- Stored Procedure : dbo.usp_CheckForWinner
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Checks all 200 bingo cards for a given game against all
--   12 standard winning patterns after each song is called.
--   If a winner is found, the card is auto-flagged, the Game
--   record is updated to Complete, and the winner details are
--   returned. If no winner is found, a 'No winner yet' result
--   is returned and the game continues.
--
-- PARAMETERS:
--   @Game_ID        INT  -- The Game to check. Must exist in
--                        -- the Game table.
--
-- HOW IT WORKS:
--   Uses CROSS APPLY VALUES to check all 12 winning patterns
--   against every card in a single pass — no looping required.
--   Cards already flagged as winners (Card_IsWinner = 1) are
--   skipped. If multiple cards win on the same song call, the
--   card with the lowest Card_ID is declared the winner.
--
-- 12 WINNING PATTERNS CHECKED:
--   Rows (5):
--     - Row 1 : Sq_B1, Sq_I1, Sq_N1, Sq_G1, Sq_O1
--     - Row 2 : Sq_B2, Sq_I2, Sq_N2, Sq_G2, Sq_O2
--     - Row 3 : Sq_B3, Sq_I3, Sq_N3(FREE), Sq_G3, Sq_O3
--     - Row 4 : Sq_B4, Sq_I4, Sq_N4, Sq_G4, Sq_O4
--     - Row 5 : Sq_B5, Sq_I5, Sq_N5, Sq_G5, Sq_O5
--
--   Columns (5):
--     - Col B : Sq_B1, Sq_B2, Sq_B3, Sq_B4, Sq_B5
--     - Col I : Sq_I1, Sq_I2, Sq_I3, Sq_I4, Sq_I5
--     - Col N : Sq_N1, Sq_N2, Sq_N3(FREE), Sq_N4, Sq_N5
--     - Col G : Sq_G1, Sq_G2, Sq_G3, Sq_G4, Sq_G5
--     - Col O : Sq_O1, Sq_O2, Sq_O3, Sq_O4, Sq_O5
--
--   Diagonals (2):
--     - Diag TL-BR : Sq_B1, Sq_I2, Sq_N3(FREE), Sq_G4, Sq_O5
--     - Diag TR-BL : Sq_O1, Sq_G2, Sq_N3(FREE), Sq_I4, Sq_B5
--
-- FREE SPACE NOTE:
--   Sq_N3_Called is always 1 (FREE SPACE). Any winning pattern
--   that includes N3 gets it for free, making Row 3, Col N,
--   and both diagonals easier to complete.
--
-- WHAT IT AUTO-FLAGS ON A WIN:
--   Cards table:
--     - Card_IsWinner set to 1 on the winning card
--
--   Game table:
--     - Game_WinnerCard_ID set to the winning Card_ID
--     - Game_Status set to 'Complete'
--     - Game_EndTime stamped with SYSDATETIME()
--
-- USAGE:
--   -- Call after every usp_CallSong execution:
--   EXEC dbo.usp_CallSong      @Game_ID = 1, @Song_ID = 42;
--   EXEC dbo.usp_CheckForWinner @Game_ID = 1;
--
-- RETURNS:
--   Single row result:
--     - Game_ID           : The game that was checked
--     - Winning_Card_ID   : Card_ID of the winner (NULL if none)
--     - Winning_Pattern   : Pattern that won e.g. 'Row 3', 
--                           'Col B', 'Diag TL-BR' (NULL if none)
--     - Player_Name       : Card_PlayerName (NULL if none)
--     - Player_Email      : Card_PlayerEmail (NULL if none)
--     - Result            : 'BINGO!' or 'No winner yet'
--
-- GAME LOOP THIS PROC BELONGS TO:
--   1. usp_GenerateBingoCards  -- Generate 200 cards for a game
--   2. usp_CallSong            -- DJ plays a song, flip Called flags
--   3. usp_CheckForWinner      -- Check all 12 patterns for a winner
--   4. usp_ResetGame           -- Reset and replay with same cards
--
-- ERROR CONDITIONS:
--   - @Game_ID not found : Game does not exist error, nothing changes
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================