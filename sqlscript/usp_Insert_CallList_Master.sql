-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description:	Inserts a new record into the CallList_Master table.
--              Validates required fields, sets CreatedAt timestamp,
--              and returns the newly generated Call_List_ID.
-- =============================================
-- How It Works:
--   1. Accepts all relevant CallList_Master fields as parameters.
--   2. Validates that required fields (@Call_List_Name, @Call_List_Date,
--      @Game_ID) are not NULL or empty.
--   3. Defaults @Call_List_IsActive to 1 (Active) if not provided.
--   4. Sets @Call_List_CreatedAt to GETDATE() automatically.
--   5. Inserts the new row into [dbo].[CallList_Master].
--   6. Returns the newly created Call_List_ID via SCOPE_IDENTITY().
--   7. If any error occurs, the CATCH block rolls back and raises the error.
-- =============================================

Alter PROCEDURE [dbo].[usp_Insert_CallList_Master]
    @Call_List_Name         VARCHAR(150),
    @Call_List_Date         DATE,
    @Call_List_Description  NVARCHAR(500)   = NULL,
    @Game_ID                INT,
    @Call_List_Genre        VARCHAR(100)    = NULL,
    @Call_List_Decade       VARCHAR(5)      = NULL,
    @Call_List_Era          VARCHAR(10)     = NULL,
    @Call_List_SongCount    INT             = 0,
    @Call_List_IsActive     BIT             = 1,
    @NewCallListID          INT             OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Validation
    -- =============================================
    IF @Call_List_Name IS NULL OR LTRIM(RTRIM(@Call_List_Name)) = ''
    BEGIN
        RAISERROR('Call_List_Name is required and cannot be empty.', 16, 1);
        RETURN;
    END

    IF @Call_List_Date IS NULL
    BEGIN
        RAISERROR('Call_List_Date is required and cannot be NULL.', 16, 1);
        RETURN;
    END

    IF @Game_ID IS NULL
    BEGIN
        RAISERROR('Game_ID is required and cannot be NULL.', 16, 1);
        RETURN;
    END

    -- =============================================
    -- Insert & Error Handling
    -- =============================================
    BEGIN TRY
        BEGIN TRANSACTION;

            INSERT INTO [dbo].[CallList_Master]
            (
                [Call_List_Name],
                [Call_List_Date],
                [Call_List_Description],
                [Game_ID],
                [Call_List_Genre],
                [Call_List_Decade],
                [Call_List_Era],
                [Call_List_SongCount],
                [Call_List_IsActive],
                [Call_List_CreatedAt]
            )
            VALUES
            (
                @Call_List_Name,
                @Call_List_Date,
                @Call_List_Description,
                @Game_ID,
                @Call_List_Genre,
                @Call_List_Decade,
                @Call_List_Era,
                @Call_List_SongCount,
                @Call_List_IsActive,
                GETDATE()
            );

            -- Capture the newly generated identity value
            SET @NewCallListID = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage  NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT            = ERROR_SEVERITY();
        DECLARE @ErrorState    INT            = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH

END
GO


DECLARE @NewID INT;

SELECT @NewID AS NewlyInserted_Call_List_ID;