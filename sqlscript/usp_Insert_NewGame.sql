-- =============================================
-- Author:      DBA / Developer
-- Create Date: 2026-05-04
-- Description: Inserts a new Game record into
--              the [dbo].[Game] table.
--              Game_ID is auto-generated via
--              IDENTITY(1,1) and returned as
--              an OUTPUT parameter.
--              Game_CreatedAt defaults to the
--              current UTC timestamp.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Insert_NewGame]
    -- ----------------------------------------
    -- INPUT PARAMETERS
    -- ----------------------------------------
    @GN_ID            INT,            -- Foreign key to parent Night/Session
    @Game_Number      TINYINT,        -- Sequence number of the game (1-255)
    @Game_Name        VARCHAR(100),   -- Optional descriptive name for the game
    @Game_StartTime   DATETIME2(7),   -- When the game is scheduled to / did start
    @Game_EndTime     DATETIME2(7),   -- When the game ended (NULL if not yet ended)
    @Game_WinPattern  VARCHAR(50),    -- Win condition e.g. 'Full House', 'Line', 'T-Shape'
    @Game_WinnerCard_ID INT,          -- Card ID of the winning card (NULL until game ends)
    @Game_Status      VARCHAR(20),    -- Current status e.g. 'Pending','Active','Completed'

    -- ----------------------------------------
    -- OUTPUT PARAMETER
    -- Returns the newly generated Game_ID
    -- so the caller knows the new record's PK
    -- ----------------------------------------
    @New_Game_ID      INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;  -- Suppress "rows affected" noise

    BEGIN TRY

        -- Validate that a required foreign key was supplied
        IF @GN_ID IS NULL
        BEGIN
            RAISERROR('GN_ID cannot be NULL. A valid Night/Session ID is required.', 16, 1);
            RETURN;
        END

        -- Validate Game_Status is one of the accepted values
        IF @Game_Status NOT IN ('Pending', 'Active', 'Completed', 'Cancelled')
        BEGIN
            RAISERROR('Invalid Game_Status. Accepted values: Pending, Active, Completed, Cancelled.', 16, 1);
            RETURN;
        END

        -- ----------------------------------------
        -- INSERT the new Game row.
        -- Game_ID    -> auto-assigned by IDENTITY
        -- Game_CreatedAt -> stamped with UTC now
        -- ----------------------------------------
        INSERT INTO [dbo].[Game]
        (
            [GN_ID],
            [Game_Number],
            [Game_Name],
            [Game_StartTime],
            [Game_EndTime],
            [Game_WinPattern],
            [Game_WinnerCard_ID],
            [Game_Status],
            [Game_CreatedAt]
        )
        VALUES
        (
            @GN_ID,
            @Game_Number,
            @Game_Name,
            @Game_StartTime,
            @Game_EndTime,
            @Game_WinPattern,
            @Game_WinnerCard_ID,
            @Game_Status,
            SYSUTCDATETIME()    -- Always capture insert time in UTC
        );

        -- ----------------------------------------
        -- Capture the newly created IDENTITY value
        -- and pass it back to the caller
        -- ----------------------------------------
        SET @New_Game_ID = SCOPE_IDENTITY();

    END TRY
    BEGIN CATCH
        -- ----------------------------------------
        -- Surface any runtime errors with full
        -- diagnostic context for easy debugging
        -- ----------------------------------------
        SELECT
            ERROR_NUMBER()    AS ErrorNumber,
            ERROR_SEVERITY()  AS ErrorSeverity,
            ERROR_STATE()     AS ErrorState,
            ERROR_PROCEDURE() AS ErrorProcedure,
            ERROR_LINE()      AS ErrorLine,
            ERROR_MESSAGE()   AS ErrorMessage;

    END CATCH;
END;
GO