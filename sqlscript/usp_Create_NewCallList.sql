-- ============================================================
-- Stored Procedure : dbo.usp_Create_NewCallList
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Creates a new CallList_Master parent record for a Music
--   Bingo call list. A call list is a curated set of songs
--   used for a specific game night. Once the master record
--   is created, songs are added to it via
--   usp_Add_CallList_Song using the returned Call_List_ID.
--
-- PARAMETERS:
--   @Call_List_Name        VARCHAR(150)  -- Required. Name of
--                                        -- the call list.
--                                        -- e.g. '80s Night'
--   @Call_List_Date        DATE          -- Required. Date the
--                                        -- call list will be
--                                        -- used.
--   @Call_List_Description NVARCHAR(500) -- Optional. Notes or
--                                        -- description of the
--                                        -- list.
--   @Call_List_Genre       VARCHAR(100)  -- Optional. Primary
--                                        -- genre of the list.
--   @Call_List_Decade      VARCHAR(5)    -- Optional. Decade
--                                        -- focus e.g. '80s'
--   @Call_List_Era         VARCHAR(100)  -- Optional. Era focus
--                                        -- e.g. 'Classic'
--
-- HOW IT WORKS:
--   Validates that @Call_List_Name and @Call_List_Date are
--   provided then inserts a new row into CallList_Master.
--   Call_List_SongCount defaults to 0 and is incremented
--   automatically by usp_Add_CallList_Song as songs are added.
--   Call_List_IsActive defaults to 1 (Active).
--   Returns the new Call_List_ID for use in the next step.
--
-- USAGE:
--   EXEC dbo.usp_Create_NewCallList
--       @Call_List_Name        = '80s Night',
--       @Call_List_Date        = '2026-04-26',
--       @Call_List_Description = 'Best of the 80s',
--       @Call_List_Genre       = 'Pop',
--       @Call_List_Decade      = '80s',
--       @Call_List_Era         = 'Classic';
--
-- RETURNS:
--   Single row summary:
--     - Call_List_ID          : Newly created ID
--     - Call_List_Name        : Name of the list
--     - Call_List_Date        : Date of the list
--     - Call_List_IsActive    : Always 1 on creation
--     - Call_List_CreatedAt   : Timestamp of creation
--
-- NEXT STEP:
--   Use the returned Call_List_ID to add songs:
--   EXEC dbo.usp_Add_CallList_Song @Call_List_ID = 1, ...
--
-- ERROR CONDITIONS:
--   - @Call_List_Name empty   : Name is required error
--   - @Call_List_Date is NULL : Date is required error
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================

CREATE PROCEDURE dbo.usp_Create_NewCallList
    @Call_List_Name        VARCHAR(150),
    @Call_List_Date        DATE,
    @Call_List_Description NVARCHAR(500) = NULL,
    @Call_List_Genre       VARCHAR(100)  = NULL,
    @Call_List_Decade      VARCHAR(5)    = NULL,
    @Call_List_Era         VARCHAR(100)  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validation
    ------------------------------------------------------------
    IF @Call_List_Name IS NULL OR LTRIM(RTRIM(@Call_List_Name)) = ''
    BEGIN
        RAISERROR('Call_List_Name is required and cannot be empty.', 16, 1);
        RETURN;
    END;

    IF @Call_List_Date IS NULL
    BEGIN
        RAISERROR('Call_List_Date is required.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Insert master record
    ------------------------------------------------------------
    INSERT INTO dbo.CallList_Master (
        Call_List_Name,
        Call_List_Date,
        Call_List_Description,
        Call_List_Genre,
        Call_List_Decade,
        Call_List_Era,
        Call_List_SongCount,
        Call_List_IsActive,
        Call_List_CreatedAt
    )
    VALUES (
        @Call_List_Name,
        @Call_List_Date,
        @Call_List_Description,
        @Call_List_Genre,
        @Call_List_Decade,
        @Call_List_Era,
        0,                  -- SongCount starts at 0
        1,                  -- IsActive defaults to Active
        SYSDATETIME()
    );

    ------------------------------------------------------------
    -- Return the new master record
    ------------------------------------------------------------
    SELECT
        Call_List_ID,
        Call_List_Name,
        Call_List_Date,
        Call_List_IsActive,
        Call_List_CreatedAt
    FROM dbo.CallList_Master
    WHERE Call_List_ID = SCOPE_IDENTITY();

END;
GO


-- ============================================================
-- Stored Procedure : dbo.usp_Add_CallList_Song
-- Database         : haloimag_djgogi
-- Author           : DJGogi
-- Created          : April 22, 2026
-- ============================================================
-- DESCRIPTION:
--   Adds a single song to an existing CallList_Master record
--   by inserting a row into dbo.CallList_Songs. After each
--   successful insert, the parent CallList_Master.
--   Call_List_SongCount is automatically incremented by 1
--   and Call_List_UpdatedAt is stamped with the current time.
--
-- PARAMETERS:
--   @Call_List_ID     INT           -- Required. The parent
--                                   -- CallList_Master record
--                                   -- to add the song to.
--   @title            NVARCHAR(255) -- Required. Song title.
--   @artist           NVARCHAR(255) -- Required. Primary artist.
--   @featured_artist  NVARCHAR(255) -- Optional. Featured artist.
--   @lead_vocalist    NVARCHAR(255) -- Optional. Lead vocalist
--                                   -- if different from artist.
--   @artist_type      VARCHAR(20)   -- Optional. e.g. 'Solo',
--                                   -- 'Band', 'Duo'
--   @genre            VARCHAR(100)  -- Optional. Song genre.
--   @explicit         BIT           -- Optional. Default 0.
--                                   -- 1 = explicit content.
--   @release_year     SMALLINT      -- Optional. Year released.
--   @decade           VARCHAR(5)    -- Optional. e.g. '80s'
--   @era              VARCHAR(10)   -- Optional. e.g. 'Classic'
--
-- HOW IT WORKS:
--   Validates that @Call_List_ID exists in CallList_Master
--   and that @title and @artist are provided. Inserts the
--   song into CallList_Songs then updates the parent master
--   record incrementing Call_List_SongCount by 1 and stamping
--   Call_List_UpdatedAt with the current timestamp.
--
-- USAGE:
--   EXEC dbo.usp_Add_CallList_Song
--       @Call_List_ID    = 1,
--       @title           = 'Take On Me',
--       @artist          = 'a-ha',
--       @genre           = 'Pop',
--       @explicit        = 0,
--       @release_year    = 1985,
--       @decade          = '80s',
--       @era             = 'Classic';
--
-- RETURNS:
--   Single row summary:
--     - song_id             : Newly created song ID
--     - Call_List_ID        : Parent list ID
--     - title               : Song title
--     - artist              : Primary artist
--     - Call_List_SongCount : Updated total songs in list
--
-- ERROR CONDITIONS:
--   - @Call_List_ID not found : Call list does not exist error
--   - @title empty            : Title is required error
--   - @artist empty           : Artist is required error
--
-- CHANGE LOG:
--   April 22, 2026 - Initial version created
-- ============================================================

CREATE PROCEDURE dbo.usp_Add_CallList_Song
    @Call_List_ID    INT,
    @title           NVARCHAR(255),
    @artist          NVARCHAR(255),
    @featured_artist NVARCHAR(255) = NULL,
    @lead_vocalist   NVARCHAR(255) = NULL,
    @artist_type     VARCHAR(20)   = NULL,
    @genre           VARCHAR(100)  = NULL,
    @explicit        BIT           = 0,
    @release_year    SMALLINT      = NULL,
    @decade          VARCHAR(5)    = NULL,
    @era             VARCHAR(10)   = NULL
AS
BEGIN
    SET NOCOUNT ON;

    ------------------------------------------------------------
    -- Validation
    ------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM dbo.CallList_Master WHERE Call_List_ID = @Call_List_ID)
    BEGIN
        RAISERROR('Call_List_ID %d does not exist in CallList_Master.', 16, 1, @Call_List_ID);
        RETURN;
    END;

    IF @title IS NULL OR LTRIM(RTRIM(@title)) = ''
    BEGIN
        RAISERROR('Song title is required and cannot be empty.', 16, 1);
        RETURN;
    END;

    IF @artist IS NULL OR LTRIM(RTRIM(@artist)) = ''
    BEGIN
        RAISERROR('Artist is required and cannot be empty.', 16, 1);
        RETURN;
    END;

    ------------------------------------------------------------
    -- Insert song into CallList_Songs
    ------------------------------------------------------------
    INSERT INTO dbo.CallList_Songs (
        Call_List_ID,
        title,
        artist,
        featured_artist,
        lead_vocalist,
        artist_type,
        genre,
        explicit,
        release_year,
        decade,
        era,
        last_played
    )
    VALUES (
        @Call_List_ID,
        @title,
        @artist,
        @featured_artist,
        @lead_vocalist,
        @artist_type,
        @genre,
        @explicit,
        @release_year,
        @decade,
        @era,
        NULL            -- last_played starts NULL
    );

    DECLARE @NewSongID INT = SCOPE_IDENTITY();

    ------------------------------------------------------------
    -- Update parent master record
    ------------------------------------------------------------
    UPDATE dbo.CallList_Master
    SET
        Call_List_SongCount = Call_List_SongCount + 1,
        Call_List_UpdatedAt = SYSDATETIME()
    WHERE Call_List_ID = @Call_List_ID;

    ------------------------------------------------------------
    -- Return summary
    ------------------------------------------------------------
    SELECT
        s.song_id,
        s.Call_List_ID,
        s.title,
        s.artist,
        m.Call_List_SongCount
    FROM dbo.CallList_Songs   s
    JOIN dbo.CallList_Master  m ON m.Call_List_ID = s.Call_List_ID
    WHERE s.song_id = @NewSongID;

END;
GO