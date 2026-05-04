USE [haloimag_djgogi]
GO

-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description: Deletes a song from the CallList_Songs table
--              based on the provided song_id and Call_List_ID.
--              Both parameters are required to ensure the correct
--              song is removed from the correct call list.
-- =============================================
CREATE PROCEDURE [dbo].[usp_Delete_CallList_Song]
    @song_id        INT,        -- The unique identifier of the song to delete
    @Call_List_ID   INT         -- The call list the song belongs to
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate that the record exists before attempting deletion
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[CallList_Songs]
        WHERE [song_id]      = @song_id
          AND [Call_List_ID] = @Call_List_ID
    )
    BEGIN
        -- Return a meaningful message if no matching record is found
        RAISERROR('No matching song found for the provided song_id and Call_List_ID.', 16, 1);
        RETURN;
    END

    -- Delete the song that matches both the song_id and Call_List_ID
    DELETE FROM [dbo].[CallList_Songs]
    WHERE [song_id]      = @song_id
      AND [Call_List_ID] = @Call_List_ID;

    -- Confirm how many rows were affected
    PRINT CAST(@@ROWCOUNT AS VARCHAR(10)) + ' row(s) deleted successfully.';

END;
GO
