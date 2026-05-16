import { BingoCallListSong, BingoCallListSongsBy4Inning } from './bingo-game.model';

export type InningColumnKey = 1 | 2 | 3 | 4;

/** One song row inside an inning column. */
export interface CallListSongColumnItem {
  songId: number;
  callListId: number;
  inning: number;
  title: string;
  artist: string;
  genre: string | null;
  decade: string | null;
  era: string | null;
  lastPlayed: string | null;
  detailLine: string;
}

/** A single inning column in the 4-column layout. */
export interface CallListSongsInningColumn {
  inning: InningColumnKey;
  label: string;
  songs: CallListSongColumnItem[];
  songCount: number;
  isActive: boolean;
}

/** View model for `clsong-review` — four columns keyed by inning. */
export interface CallListSongsFourColumnView {
  gameId: number;
  callListId: number;
  activeInning: number;
  columns: CallListSongsInningColumn[];
  totalSongCount: number;
}

const INNING_KEYS: readonly (keyof BingoCallListSongsBy4Inning)[] = [
  'Inning1',
  'Inning2',
  'Inning3',
  'Inning4'
];

export function buildCallListSongsFourColumnView(
  source: BingoCallListSongsBy4Inning,
  gameId: number,
  callListId: number,
  activeInning: number
): CallListSongsFourColumnView {
  const normalizedActive = normalizeInningColumnKey(activeInning);

  const columns = INNING_KEYS.map((key, index) => {
    const inning = (index + 1) as InningColumnKey;
    const songs = (source[key] ?? []).map(song => mapSongToColumnItem(song, inning));

    return {
      inning,
      label: `Inning ${inning}`,
      songs,
      songCount: songs.length,
      isActive: inning === normalizedActive
    };
  });

  return {
    gameId,
    callListId,
    activeInning: normalizedActive,
    columns,
    totalSongCount: columns.reduce((sum, col) => sum + col.songCount, 0)
  };
}

function mapSongToColumnItem(song: BingoCallListSong, fallbackInning: InningColumnKey): CallListSongColumnItem {
  const artist = song.artist?.trim() || 'Unknown artist';
  const decade = song.decade?.trim() || null;
  const detailParts = [artist];
  if (decade) {
    detailParts.push(decade);
  }

  const inningRaw = song.inning;
  const inning =
    inningRaw !== null && inningRaw !== undefined && Number.isFinite(inningRaw)
      ? Math.trunc(inningRaw)
      : fallbackInning;

  return {
    songId: song.song_id,
    callListId: song.Call_List_ID,
    inning,
    title: song.title?.trim() || 'Untitled song',
    artist,
    genre: song.genre?.trim() || null,
    decade,
    era: song.era?.trim() || null,
    lastPlayed: song.last_played,
    detailLine: detailParts.join(' • ')
  };
}

function normalizeInningColumnKey(value: number): InningColumnKey {
  const n = Math.trunc(value);
  if (n >= 1 && n <= 4) {
    return n as InningColumnKey;
  }
  return 1;
}
