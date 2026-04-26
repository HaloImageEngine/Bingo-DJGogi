USE [haloimag_djgogi]
GO

DECLARE	@return_value int

EXEC	@return_value = [dbo].[usp_Clear_All_CalledFlags]
		@Game_ID = 1

SELECT	'Return Value' = @return_value

GO
