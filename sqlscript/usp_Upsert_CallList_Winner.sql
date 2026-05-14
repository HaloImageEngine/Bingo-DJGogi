USE [haloimag_djgogi]
GO
/****** Object:  StoredProcedure [dbo].[usp_UpsertCallListWinner]    Script Date: 5/13/2026 9:45:00 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- Stored Procedure : dbo.usp_UpsertCallListWinner
-- Database         : haloimag_djgogi
-- Author           : William D Beaty
-- Created          : May 13, 2026
-- ============================================================
-- DESCRIPTION:
--   Inserts or updates a winner record in the CallList_Winner
--   table. This proc tracks which card won for a specific
--   Game, Call List, and Inning combination.
--
--   If a record already exists for the given Game_ID,
--   Call_List_ID, and Inning, the winning card is updated
--   and the UpdatedAt timestamp is refreshed. If no record
--   exists, a new one is inserted with the current timestamp.
--
--   This is an "upsert" operation — UPDATE if exists, INSERT
--   if not — ensuring exactly one winner record per unique
--   Game/CallList/Inning combination.
--
-- PARAMETERS:
--   @Game_ID              INT  -- The Game this winner belongs to
--   @Call_List_ID         INT  -- The Call List used for this game
--   @Inning               INT  -- The Inning number (1, 2, 3, etc.)
--   @Call_List_WinningCard INT -- The Card_ID of the winning card
--
-- HOW IT WORKS:
--   1. Checks if a record exists with the given Game_ID,
--      Call_List_ID, and Inning combination
--   2. If EXISTS:
--      - UPDATE the Call_List_WinningCard to the new value
--      - Set Call_List_UpdatedAt to current timestamp
--   3. If NOT EXISTS:
--      - INSERT a new record with all provided values
--      - Set Call_List_CreatedAt to current timestamp
--   4. Return a result message indicating action taken
--
-- USAGE:
--   -- Record a winner for Game 1, Call List 5, Inning 3
--   EXEC [dbo].[usp_UpsertCallListWinner]
--       @Game_ID              = 1,
--       @Call_List_ID         = 5,
--       @Inning               = 3,
--       @Call_List_WinningCard = 42;
--
--   -- Update the same record with a different winning card
--   EXEC [dbo].[usp_UpsertCallListWinner]
--       @Game_ID              = 1,
--       @Call_List_ID         = 5,
--       @Inning               = 3,
--       @Call_List_WinningCard = 89;
--
-- RETURNS:
--   A single-row result set with a 'Result' column:
--     - 'Record inserted' : A new winner record was created
--     - 'Record updated'  : An existing record was updated
--
-- TYPICAL CALL SEQUENCE:
--   This proc is typically called from the CheckForWinner
--   stored procedures after a winning card is identified:
--
--   1. EXEC usp_CallSong                  -- DJ plays a song
--   2. EXEC usp_CheckForWinner_Blackout   -- Check for winner
--   3. EXEC usp_UpsertCallListWinner      -- Record the winner
--
-- RELATED PROCEDURES:
--   usp_CheckForWinner_Blackout   -- Detects Blackout winners
--   usp_CheckForWinner_2Line      -- Detects 2-line winners
--   usp_CheckForWinner_4Corners   -- Detects 4-corner winners
--   usp_CheckForWinner            -- Detects standard winners
--
-- ERROR CONDITIONS:
--   None currently raised. If foreign key constraints are
--   enabled on the table, invalid Game_ID, Call_List_ID,
--   or Call_List_WinningCard values will fail at the
--   database level.
--
-- NOTES:
--   - The natural key for this table is the combination of
--     Game_ID + Call_List_ID + Inning. Only one winner per
--     unique combination is allowed.
--   - Call_List_CreatedAt has a DEFAULT constraint of
--     SYSDATETIME() on the table, but we set it explicitly
--     here for clarity and consistency.
--   - Call_List_UpdatedAt is NULL on insert and only gets
--     a value when the record is updated.
--
-- CHANGE LOG:
--   May 13, 2026 - Initial version created
-- ============================================================
CREATE PROCEDURE [dbo].[usp_Upsert_CallList_Winner]
    @Game_ID              INT,
    @Call_List_ID         INT,
    @Inning               INT,
    @Call_List_WinningCard INT
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Check if a record already exists for this Game/CallList/Inning
    -- combination. The natural key is Game_ID + Call_List_ID + Inning.
    ------------------------------------------------------------
    IF EXISTS (
        SELECT 1 
        FROM [dbo].[CallList_Winner]
        WHERE [Game_ID]       = @Game_ID
          AND [Call_List_ID]  = @Call_List_ID
          AND [Inning]        = @Inning
    )
    BEGIN
        ------------------------------------------------------------
        -- Record exists — UPDATE the winning card and timestamp
        ------------------------------------------------------------
        UPDATE [dbo].[CallList_Winner]
        SET    [Call_List_WinningCard] = @Call_List_WinningCard,
               [Call_List_UpdatedAt]   = SYSDATETIME()
        WHERE  [Game_ID]       = @Game_ID
          AND  [Call_List_ID]  = @Call_List_ID
          AND  [Inning]        = @Inning;

        -- Return success message
        SELECT 'Record updated' AS Result;
    END
    ELSE
    BEGIN
        ------------------------------------------------------------
        -- Record does not exist — INSERT a new winner record
        ------------------------------------------------------------
        INSERT INTO [dbo].[CallList_Winner] (
            [Game_ID],
            [Call_List_ID],
            [Inning],
            [Call_List_WinningCard],
            [Call_List_CreatedAt]
        )
        VALUES (
            @Game_ID,
            @Call_List_ID,
            @Inning,
            @Call_List_WinningCard,
            SYSDATETIME()
        );

        -- Return success message
        SELECT 'Record inserted' AS Result;
    END;

END;
GO

-- ============================================================
-- USAGE EXAMPLES
-- ============================================================

---- Example 1: Insert a new winner record
--EXEC [dbo].[usp_UpsertCallListWinner]
--    @Game_ID              = 1,
--    @Call_List_ID         = 5,
--    @Inning               = 3,
--    @Call_List_WinningCard = 42;
---- Result: 'Record inserted'

---- Example 2: Update the same record (same Game/CallList/Inning)
--EXEC [dbo].[usp_UpsertCallListWinner]
--    @Game_ID              = 1,
--    @Call_List_ID         = 5,
--    @Inning               = 3,
--    @Call_List_WinningCard = 89;
---- Result: 'Record updated'
---- (Call_List_UpdatedAt is now set to current time)

---- Example 3: Insert a different inning for the same game
--EXEC [dbo].[usp_UpsertCallListWinner]
--    @Game_ID              = 1,
--    @Call_List_ID         = 5,
--    @Inning               = 4,
--    @Call_List_WinningCard = 101;
---- Result: 'Record inserted'
---- (New record because Inning is different)