-- =============================================
-- Author:		William D Beaty
-- Create Date:	2026-05-01
-- Description:	Retrieves all records from the CallList_Master table.
--              Returns all columns along with an optional filter
--              for Active/Inactive records. Results are ordered
--              by Call_List_Date descending (most recent first).
-- =============================================
-- How It Works:
--   1. Accepts an optional @IsActive parameter to filter by
--      active (1), inactive (0), or all records (NULL).
--   2. Selects all columns from [dbo].[CallList_Master].
--   3. Applies the IsActive filter only when @IsActive is provided.
--   4. Orders results by Call_List_Date DESC so the most
--      recent call lists appear at the top.
--   5. If any error occurs, the CATCH block raises the error
--      back to the caller.
-- =============================================

CREATE PROCEDURE [dbo].[usp_Get_All_CallList_Master]
    @IsActive   BIT = NULL      -- NULL = All Records | 1 = Active Only | 0 = Inactive Only
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Retrieve Records
    -- =============================================
    BEGIN TRY

        SELECT
            [Call_List_ID],
            [Call_List_Name],
            [Call_List_Date],
            [Call_List_Description],
            [Game_ID],
            [Call_List_Genre],
            [Call_List_Decade],
            [Call_List_Era],
            [Call_List_SongCount],
            [Call_List_IsActive],
            [Call_List_CreatedAt],
            [Call_List_UpdatedAt]
        FROM
            [dbo].[CallList_Master]
        WHERE
            (@IsActive IS NULL OR [Call_List_IsActive] = @IsActive)
        ORDER BY
            [Call_List_Date] DESC,
            [Call_List_Name] ASC;

    END TRY
    BEGIN CATCH

        DECLARE @ErrorMessage  NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT            = ERROR_SEVERITY();
        DECLARE @ErrorState    INT            = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);

    END CATCH

END
GO


---- =============================================
---- TEST EXECs
---- =============================================

---- 1) Return ALL records (active and inactive)
--EXEC [dbo].[usp_Get_All_CallList_Master];

---- 2) Return ACTIVE records only
--EXEC [dbo].[usp_Get_All_CallList_Master]
--    @IsActive = 1;

---- 3) Return INACTIVE records only
--EXEC [dbo].[usp_Get_All_CallList_Master]
--    @IsActive = 0;