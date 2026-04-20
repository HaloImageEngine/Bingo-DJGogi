-- =============================================
-- Author:      William Beaty
-- Create date: 2026-04-20
-- Description: Get all songs by a specific artist
-- =============================================
CREATE PROCEDURE dbo.usp_Get_AllSongs_byArtist
(
    @artist NVARCHAR(255)
)
AS
BEGIN
    SET NOCOUNT ON;

    -- =============================================
    -- Select all songs for the given artist
    -- =============================================
    SELECT
        title,
        artist,
        artist_type,
        genre,
        subgenre,
        mood,
        tempo,
        release_year,
        decade,
        era,
        bingo_category,
        difficulty,
        chart_peak_position,
        chart_country,
        spotify_popularity,
        duration_seconds,
        active
    FROM dbo.songs
    WHERE artist = @artist
    ORDER BY release_year DESC, title ASC;  -- newest first, then alphabetical
END
GO