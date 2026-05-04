import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormsModule, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { BingoCallListCreate, BingoCallListMaster, BingoCallListSong, BingoCallListSongInsert } from '../../models/bingo-game.model';
import { LookupOption } from '../../models/lookup-option.model';
import { ModelSongDisplay } from '../../models/model-song-display.model';
import { CallListService } from '../../services/calllist.service';
import { SongService } from '../../services/song.service';

const trimmedRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  return typeof control.value === 'string' && control.value.trim().length === 0
    ? { required: true }
    : null;
};

@Component({
  selector: 'app-edit-song-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-song-list.component.html',
  styleUrl: './edit-song-list.component.scss'
})
export class EditSongListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly songService = inject(SongService);
  private readonly callListService = inject(CallListService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly loadingLookups = signal(false);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly showEditForm = signal(false);
  readonly editedList = signal<BingoCallListCreate | null>(null);
  readonly songs = signal<ModelSongDisplay[]>([]);
  readonly selectedSongs = signal<ModelSongDisplay[]>([]);
  readonly callListSongs = signal<BingoCallListSong[]>([]);
  readonly selectedCallListMaster = signal<BingoCallListMaster | null>(null);
  readonly searchTerm = signal('');
  readonly callListMasters = signal<BingoCallListMaster[]>([]);
  readonly loadingCallListMasters = signal(false);
  readonly callListMasterError = signal<string | null>(null);
  readonly loadingCallListSongs = signal(false);
  readonly callListSongError = signal<string | null>(null);
  readonly addingSongId = signal<number | null>(null);
  readonly maxGameId = signal<number | null>(null);
  readonly maxCallListId = signal<number | null>(null);
  readonly genreOptions = signal<LookupOption[]>([]);
  readonly decadeOptions = signal<LookupOption[]>([]);
  readonly eraOptions = signal<LookupOption[]>([]);

  readonly form = this.formBuilder.group({
    CallListName: this.formBuilder.nonNullable.control('', [trimmedRequired, Validators.maxLength(150)]),
    CallListDate: this.formBuilder.nonNullable.control(this.today(), [Validators.required]),
    CallListDescription: this.formBuilder.nonNullable.control('', [Validators.maxLength(500)]),
    GameID: this.formBuilder.control<number | null>(null),
    CallListGenre: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    CallListDecade: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(5)]),
    CallListEra: this.formBuilder.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    CallListIsActive: this.formBuilder.nonNullable.control(true)
  });

  readonly filteredSongs = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const selectedIds = new Set(this.selectedSongs().map(song => song.song_id));

    return this.songs().filter(song => {
      if (selectedIds.has(song.song_id)) {
        return false;
      }

      if (!term) {
        return true;
      }

      const title = (song.Title ?? '').toLowerCase();
      const artist = (song.Artist ?? '').toLowerCase();
      const genre = (song.Genre ?? '').toLowerCase();

      return title.includes(term) || artist.includes(term) || genre.includes(term);
    });
  });

  readonly songCount = computed(() => this.songs().length);
  readonly selectedCount = computed(() => this.selectedSongs().length);
  readonly callListMasterCount = computed(() => this.callListMasters().length);
  readonly trackBySong = (index: number, song: ModelSongDisplay) => song.song_id ?? index;
  readonly trackByCallListMaster = (index: number, item: BingoCallListMaster) => item.Call_List_ID ?? index;
  readonly trackByCallListSong = (index: number, item: BingoCallListSong) => item.song_id ?? index;

  ngOnInit(): void {
    this.loadSongs();
    this.loadLookups();
    this.loadCallListMasters();
    this.loadMaxIds();
  }

  loadSongs(): void {
    this.loading.set(true);
    this.error.set(null);

    this.songService
      .getSongs()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Edit song list load failed', err);
          this.error.set('Unable to load songs right now.');
          return of<ModelSongDisplay[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(songs => {
        const sortedSongs = [...songs].sort((left, right) => {
          const leftTitle = left.Title ?? '';
          const rightTitle = right.Title ?? '';
          return leftTitle.localeCompare(rightTitle);
        });

        this.songs.set(sortedSongs);

        if (this.genreOptions().length === 0) {
          this.genreOptions.set(this.buildGenreFallbackOptions(sortedSongs));
        }
      });
  }

  loadMaxIds(): void {
    this.callListService.getMaxGameId()
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(val => {
        this.maxGameId.set(val);
      });

    this.callListService.getMaxCallListId()
      .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
      .subscribe(val => this.maxCallListId.set(val));
  }

  loadLookups(): void {
    this.loadingLookups.set(true);
    this.formError.set(null);

    forkJoin({
      genres: this.songService.getGenreOptions().pipe(catchError(() => of<LookupOption[]>([]))),
      decades: this.songService.getDecadeOptions().pipe(catchError(() => of<LookupOption[]>([]))),
      eras: this.songService.getEraOptions().pipe(catchError(() => of<LookupOption[]>([])))
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingLookups.set(false))
      )
      .subscribe(result => {
        this.genreOptions.set(
          result.genres.length > 0 ? this.sortLookupOptions(result.genres) : this.buildGenreFallbackOptions(this.songs())
        );
        this.decadeOptions.set(this.sortLookupOptions(result.decades));
        this.eraOptions.set(this.sortLookupOptions(result.eras));
      });
  }

  loadCallListMasters(): void {
    this.loadingCallListMasters.set(true);
    this.callListMasterError.set(null);

    this.callListService
      .getCallListMasters()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Call list master load failed', err);
          this.callListMasterError.set('Unable to load call list masters right now.');
          return of([]);
        }),
        finalize(() => this.loadingCallListMasters.set(false))
      )
      .subscribe(items => {
        this.callListMasters.set(items);

        const currentSelectedId = this.selectedCallListMaster()?.Call_List_ID;
        const nextSelected = items.find(item => item.Call_List_ID === currentSelectedId) ?? items[0] ?? null;

        if (nextSelected) {
          this.selectCallListMaster(nextSelected);
        } else {
          this.selectedCallListMaster.set(null);
          this.callListSongs.set([]);
        }
      });
  }

  selectCallListMaster(callListMaster: BingoCallListMaster): void {
    this.selectedCallListMaster.set(callListMaster);
    this.loadingCallListSongs.set(true);
    this.callListSongError.set(null);

    this.form.patchValue({
      CallListName: callListMaster.Call_List_Name,
      CallListDate: callListMaster.Call_List_Date ?? this.today(),
      CallListDescription: callListMaster.Call_List_Description ?? '',
      GameID: null,
      CallListGenre: callListMaster.Call_List_Genre ?? '',
      CallListDecade: callListMaster.Call_List_Decade ?? '',
      CallListEra: callListMaster.Call_List_Era ?? '',
      CallListIsActive: callListMaster.Call_List_IsActive
    });

    this.callListService
      .getCallListSongs(callListMaster.Call_List_ID)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Call list songs load failed', err);
          this.callListSongError.set('Unable to load call list songs right now.');
          return of<BingoCallListSong[]>([]);
        }),
        finalize(() => this.loadingCallListSongs.set(false))
      )
      .subscribe(items => {
        this.callListSongs.set(items);
      });
  }

  toggleEditForm(): void {
    this.showEditForm.update(value => !value);
    this.formError.set(null);
    this.success.set(null);
  }

  saveSongList(): void {
    this.formError.set(null);
    this.success.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Fill in the required fields before saving.');
      this.showEditForm.set(true);
      return;
    }

    const payload = this.buildCallListPayload();
    const selectedSongs = this.selectedSongs();

    this.saving.set(true);

    const songPayloads = selectedSongs.map(song => this.buildCallListSongPayload(0, song));

    this.callListService
      .buildCallList(payload, songPayloads)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Call list save failed', err);
          const modelState = err?.error?.ModelState ?? err?.error?.modelState;
          if (modelState) {
            const details = Object.entries(modelState)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
              .join(' | ');
            console.error('ModelState errors', details);
            this.formError.set(`Validation failed — ${details}`);
          } else {
            this.formError.set('Unable to save the call list right now.');
          }
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const updatedResult = {
          NewCallListID: null,
          CallListName: result.master.Call_List_Name,
          CallListDate: result.master.Call_List_Date ?? '',
          CallListDescription: result.master.Call_List_Description ?? '',
          GameID: payload.GameID,
          CallListGenre: result.master.Call_List_Genre ?? '',
          CallListDecade: result.master.Call_List_Decade ?? '',
          CallListEra: result.master.Call_List_Era ?? '',
          CallListSongCount: result.master.Call_List_SongCount,
          CallListIsActive: result.master.Call_List_IsActive,
          CallListCreatedAt: result.master.Call_List_CreatedAt,
          CallListID: result.master.Call_List_ID
        } satisfies BingoCallListCreate;

        this.editedList.set(updatedResult);
        this.callListMasters.update(items => [result.master, ...items.filter(item => item.Call_List_ID !== result.master.Call_List_ID)]);
        this.selectedCallListMaster.set(result.master);
        this.callListSongs.set(result.songs);
        this.success.set(
          result.songs.length > 0
            ? `Saved the call list and added ${result.songs.length} songs.`
            : 'Saved the call list successfully.'
        );
        this.loadMaxIds();
        this.clearSelection();
      });
  }

  insertSongDirect(song: ModelSongDisplay): void {
    const master = this.selectedCallListMaster();

    if (!master) {
      this.formError.set('Select a call list master before adding songs.');
      return;
    }

    if (this.addingSongId() !== null) {
      return;
    }

    this.addingSongId.set(song.song_id ?? null);
    this.formError.set(null);

    const payload = this.buildCallListSongPayload(master.Call_List_ID, song);

    this.callListService
      .addCallListSong(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Insert_CallList_Song failed', err);
          const modelState = err?.error?.ModelState ?? err?.error?.modelState;
          if (modelState) {
            const details = Object.entries(modelState)
              .map(([field, msgs]) => `${field}: ${(msgs as string[]).join(', ')}`)
              .join(' | ');
            this.formError.set(`Insert failed — ${details}`);
          } else {
            this.formError.set(`Failed to add "${song.Title ?? 'song'}" to the call list.`);
          }
          return of(null);
        }),
        finalize(() => this.addingSongId.set(null))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        this.success.set(`Added "${song.Title ?? 'song'}" to call list #${master.Call_List_ID}.`);
        this.callListService
          .getCallListSongs(master.Call_List_ID)
          .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(this.callListSongs())))
          .subscribe(items => this.callListSongs.set(items));
      });
  }

  addSong(song: ModelSongDisplay): void {
    if (this.selectedSongs().some(item => item.song_id === song.song_id)) {
      return;
    }

    this.selectedSongs.update(list => [...list, song]);
  }

  removeSong(song: ModelSongDisplay): void {
    this.selectedSongs.update(list => list.filter(item => item.song_id !== song.song_id));
  }

  clearSelection(): void {
    this.selectedSongs.set([]);
  }

  showFieldError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  fieldError(controlName: string): string | null {
    const control = this.form.get(controlName);

    if (!control?.errors) {
      return null;
    }

    if (control.errors['required']) {
      return 'This field is required.';
    }

    if (control.errors['maxlength']) {
      return `Maximum length is ${control.errors['maxlength'].requiredLength} characters.`;
    }

    return 'Enter a valid value.';
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) {
      return '--:--';
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  }

  private buildCallListPayload(): BingoCallListCreate {
    const value = this.form.getRawValue();

    return {
      NewCallListID: null,
      CallListName: value.CallListName.trim(),
      CallListDate: value.CallListDate,
      CallListDescription: value.CallListDescription.trim(),
      GameID: value.GameID,
      CallListGenre: value.CallListGenre,
      CallListDecade: value.CallListDecade,
      CallListEra: value.CallListEra,
      CallListSongCount: this.selectedCount(),
      CallListIsActive: value.CallListIsActive,
      CallListCreatedAt: null,
      CallListID: this.selectedCallListMaster()?.Call_List_ID ?? null
    };
  }

  private buildCallListSongPayload(callListId: number, song: ModelSongDisplay): BingoCallListSongInsert {
    return {
      CallListID: callListId,
      Title: song.Title ?? '',
      Artist: song.Artist ?? '',
      FeaturedArtist: '',
      LeadVocalist: '',
      ArtistType: song.ArtistType ?? '',
      Genre: song.Genre ?? '',
      Explicit: false,
      ReleaseYear: song.ReleaseYear ?? 0,
      Decade: song.Decade ?? '',
      Era: (song.Era ?? '').slice(0, 10),
      LastPlayed: song.LastPlayed ?? new Date().toISOString(),
      NewSongID: song.song_id ?? 0
    };
  }

  private sortLookupOptions(options: LookupOption[]): LookupOption[] {
    return [...options].sort((left, right) => (left.Name ?? '').localeCompare(right.Name ?? ''));
  }

  private buildGenreFallbackOptions(songs: ModelSongDisplay[]): LookupOption[] {
    const uniqueGenres = Array.from(new Set(songs.map(song => song.Genre?.trim()).filter((genre): genre is string => !!genre)));

    return uniqueGenres
      .sort((left, right) => left.localeCompare(right))
      .map((genre, index) => ({ Id: index + 1, Name: genre }));
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
