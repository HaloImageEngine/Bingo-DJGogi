import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { MenuItem } from '../../models/menu-item.model';
import { MenuService } from '../../services/menups.service';

interface EditableRow extends MenuItem {
  dirty: boolean;
  saving: boolean;
  rowError: string | null;
  rowSuccess: string | null;
  _original?: EditableRow;
}

@Component({
  selector: 'app-menu-listps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-listps.component.html',
  styleUrl: './menu-listps.component.scss'
})

export class MenuListpsComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly rows = signal<EditableRow[]>([]);

  readonly trackByRow = (_index: number, row: EditableRow) => row.ItemID;

  ngOnInit(): void {
    this.loadMenuItems();
  }

  loadMenuItems(): void {
    this.loading.set(true);
    this.error.set(null);
    this.menuService
      .getMenuItems()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.error.set('Unable to load menu data. Please try again.');
          console.error('Menu list load failed', err);
          return of<MenuItem[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(items => {
        this.rows.set(items.map(item => this.toEditableRow(item)));
      });
  }

  markDirty(row: EditableRow): void {
    row.dirty = true;
    row.rowSuccess = null;
  }

  saveRow(row: EditableRow): void {
    row.saving = true;
    row.rowError = null;
    row.rowSuccess = null;

    const payload = {
      ItemID: row.ItemID,
      ItemKey: row.ItemKey,
      ItemName: row.ItemName,
      ItemDescription: row.ItemDescription,
      ItemCategory: row.ItemCategory,
      ItemPriceString: row.ItemPriceString,
      ItemPrice: Number(row.ItemPrice),
      ItemCost: row.ItemCost != null ? Number(row.ItemCost) : null,
      ItemImage: row.ItemImage,
      ItemBadge: row.ItemBadge?.trim() ? row.ItemBadge.trim() : null,
      IsAvailable: row.IsAvailable,
      IsActive: row.IsActive,
      PreparationTime: row.PreparationTime != null ? Number(row.PreparationTime) : null,
      Calories: row.Calories != null ? Number(row.Calories) : null
    };

    this.menuService
      .updateMenuItem(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          row.rowError = 'Save failed. Check fields and retry.';
          console.error('Row update failed', err);
          return of(null);
        }),
        finalize(() => (row.saving = false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const updated: MenuItem = Array.isArray(result)
          ? result.find(i => i.ItemID === row.ItemID) ?? (payload as MenuItem)
          : (result as MenuItem);

        Object.assign(row, updated);
        row.dirty = false;
        row.rowSuccess = 'Saved';
      });
  }

  revertRow(row: EditableRow): void {
    this.menuService
      .getMenuItems()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(items => {
        const original = items.find(i => i.ItemID === row.ItemID);
        if (original) {
          Object.assign(row, original, { dirty: false, saving: false, rowError: null, rowSuccess: null });
        }
      });
  }

  private toEditableRow(item: MenuItem): EditableRow {
    return { ...item, dirty: false, saving: false, rowError: null, rowSuccess: null };
  }
}

