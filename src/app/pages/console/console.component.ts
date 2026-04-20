import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Song } from '../../models/song.model';

export type GameStatus = 'idle' | 'active' | 'paused' | 'finished';

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './console.component.html',
  styleUrl: './console.component.css'
})
export class ConsoleComponent {

  // --- Game state ---
  gameStatus = signal<GameStatus>('idle');
  roundNumber = signal(1);

  // --- Song pool & playlist ---
  allSongs = signal<Song[]>([]);
  playlist = signal<Song[]>([]);
  calledSongs = signal<Song[]>([]);
  currentSong = signal<Song | null>(null);

  // --- Filters ---
  searchTerm = signal('');
  genreFilter = signal('');
  decadeFilter = signal('');
  difficultyFilter = signal('');

  // --- Computed ---
  remainingCount = computed(() =>
    this.playlist().length - this.calledSongs().length
  );

  calledCount = computed(() => this.calledSongs().length);

  filteredSongs = computed(() => {
    let songs = this.allSongs();
    const term = this.searchTerm().toLowerCase();
    const genre = this.genreFilter();
    const decade = this.decadeFilter();
    const difficulty = this.difficultyFilter();

    if (term) {
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(term) ||
        s.artist.toLowerCase().includes(term)
      );
    }
    if (genre) songs = songs.filter(s => s.genre === genre);
    if (decade) songs = songs.filter(s => s.decade === decade);
    if (difficulty) songs = songs.filter(s => s.difficulty === difficulty);

    return songs;
  });

  uniqueGenres = computed(() =>
    [...new Set(this.allSongs().map(s => s.genre).filter(Boolean))] as string[]
  );

  uniqueDecades = computed(() =>
    [...new Set(this.allSongs().map(s => s.decade).filter(Boolean))] as string[]
  );

  constructor() {
    this.loadSampleSongs();
  }

  // --- Game controls ---
  startGame(): void {
    if (this.playlist().length === 0) return;
    this.gameStatus.set('active');
    this.calledSongs.set([]);
    this.currentSong.set(null);
    this.roundNumber.set(1);
  }

  pauseGame(): void {
    this.gameStatus.set('paused');
  }

  resumeGame(): void {
    this.gameStatus.set('active');
  }

  endGame(): void {
    this.gameStatus.set('finished');
    this.currentSong.set(null);
  }

  resetGame(): void {
    this.gameStatus.set('idle');
    this.calledSongs.set([]);
    this.currentSong.set(null);
    this.roundNumber.set(1);
  }

  // --- Song calling ---
  callNextSong(): void {
    const remaining = this.playlist().filter(
      s => !this.calledSongs().some(c => c.song_id === s.song_id)
    );
    if (remaining.length === 0) {
      this.endGame();
      return;
    }
    const index = Math.floor(Math.random() * remaining.length);
    const next = remaining[index];
    this.currentSong.set(next);
    this.calledSongs.update(list => [...list, next]);
  }

  callSpecificSong(song: Song): void {
    if (this.calledSongs().some(c => c.song_id === song.song_id)) return;
    this.currentSong.set(song);
    this.calledSongs.update(list => [...list, song]);
  }

  // --- Playlist management ---
  addToPlaylist(song: Song): void {
    if (this.playlist().some(s => s.song_id === song.song_id)) return;
    this.playlist.update(list => [...list, song]);
  }

  removeFromPlaylist(song: Song): void {
    this.playlist.update(list => list.filter(s => s.song_id !== song.song_id));
  }

  addAllFiltered(): void {
    const current = this.playlist();
    const toAdd = this.filteredSongs().filter(
      s => !current.some(p => p.song_id === s.song_id)
    );
    this.playlist.update(list => [...list, ...toAdd]);
  }

  clearPlaylist(): void {
    this.playlist.set([]);
  }

  shufflePlaylist(): void {
    const shuffled = [...this.playlist()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.playlist.set(shuffled);
  }

  isInPlaylist(song: Song): boolean {
    return this.playlist().some(s => s.song_id === song.song_id);
  }

  isCalled(song: Song): boolean {
    return this.calledSongs().some(c => c.song_id === song.song_id);
  }

  formatDuration(seconds?: number | null): string {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // --- Sample data (replace with API call) ---
  private loadSampleSongs(): void {
    this.allSongs.set([
      { song_id: 1, title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', subgenre: 'Classic Rock', mood: 'Epic', tempo: 'slow', release_year: 1975, decade: '70s', era: 'Classic', bingo_category: 'Karaoke Anthem', difficulty: 'easy', play_count: 0, duration_seconds: 354, active: true },
      { song_id: 2, title: 'Rolling in the Deep', artist: 'Adele', genre: 'Pop', subgenre: 'Soul Pop', mood: 'Powerful', tempo: 'medium', release_year: 2010, decade: '10s', era: 'Modern', bingo_category: 'Wedding Classic', difficulty: 'easy', play_count: 0, duration_seconds: 228, active: true },
      { song_id: 3, title: 'Happy', artist: 'Pharrell Williams', genre: 'Pop', subgenre: 'Neo Soul', mood: 'Happy', tempo: 'fast', release_year: 2013, decade: '10s', era: 'Modern', bingo_category: 'Dancefloor Filler', difficulty: 'easy', play_count: 0, duration_seconds: 233, active: true },
      { song_id: 4, title: 'Blinding Lights', artist: 'The Weeknd', genre: 'Pop', subgenre: 'Synth Pop', mood: 'Energetic', tempo: 'fast', release_year: 2019, decade: '10s', era: 'Current', bingo_category: 'Dancefloor Filler', difficulty: 'medium', play_count: 0, duration_seconds: 200, active: true },
      { song_id: 5, title: 'Mr. Brightside', artist: 'The Killers', genre: 'Rock', subgenre: 'Indie Rock', mood: 'Energetic', tempo: 'fast', release_year: 2003, decade: '00s', era: 'Retro', bingo_category: 'Karaoke Anthem', difficulty: 'medium', play_count: 0, duration_seconds: 222, active: true },
    ]);
  }
}
