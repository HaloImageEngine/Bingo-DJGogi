/****** Object:  StoredProcedure [dbo].[ups_Get_Count_CallListSongs_By_CLID_Inning]    Script Date: [Current Date] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- Author:		William D Beaty
-- Create date: <Create Date>
-- Description:	Retrieves the count of songs for a specific Call List ID and Inning
-- =============================================
-- Parameters:
--   @Call_List_ID - The unique identifier for the call list
--   @Inning       - The inning number to filter songs
-- =============================================
-- Returns:
--   SongCount - The total number of songs matching the criteria
-- =============================================
-- Usage Example:
--   EXEC ups_Get_Count_CallListSongs_By_CLID_Inning @Call_List_ID = 1, @Inning = 5
-- =============================================
-- Modification History:
-- Date         Modified By     Description
-- ----------   -------------   --------------------------------------------------
-- [Date]       [Name]          Initial creation
-- =============================================

CREATE PROCEDURE [dbo].[ups_Get_Count_CallListSongs_By_CLID_Inning]
    @Call_List_ID INT,      -- The Call List ID to filter by
    @Inning INT             -- The Inning number to filter by
AS
BEGIN
    -- Prevent extra result sets from interfering with SELECT statements
    SET NOCOUNT ON;
    
    -- Retrieve the count of songs for the specified Call List ID and Inning
    SELECT COUNT(*) AS SongCount
    FROM [dbo].[CallList_Songs]
    WHERE [Call_List_ID] = @Call_List_ID
      AND [Inning] = @Inning;
      
END
GO