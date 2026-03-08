import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { MenuItem } from '../../models/menu-item.model';
import { MenuService } from '../../services/menu.service';

@Component({
  selector: 'app-menu-manager',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './menu-manager.component.html',
  styleUrl: './menu-manager.component.scss'
})
export class MenuManagerComponent implements OnInit {
  private readonly menuService = inject(MenuService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fallbackImagePath = 'assets/images/Resized_R.jpg';

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastUpdateMessage = signal<string | null>(null);
  readonly menuItems = signal<MenuItem[]>([]);
  private readonly selectedItemId = signal<number | null>(null);

  readonly selectedItem = computed(() => {
    const id = this.selectedItemId();
    return id === null ? null : this.menuItems().find(item => item.ItemID === id) ?? null;
  });

  readonly hasSelection = computed(() => this.selectedItem() !== null);

  readonly groupedMenuItems = computed(() => {
    const items = this.menuItems();
    const groups: { category: string; items: MenuItem[] }[] = [];
    const seen = new Map<string, MenuItem[]>();

    for (const item of items) {
      const key = item.ItemCategory;
      let bucket = seen.get(key);
      if (!bucket) {
        bucket = [];
        seen.set(key, bucket);
        groups.push({ category: key, items: bucket });
      }
      bucket.push(item);
    }

    return groups;
  });

  readonly editForm = this.fb.nonNullable.group({
    ItemID: [0, [Validators.required]],
    ItemName: ['', [Validators.required, Validators.maxLength(80)]],
    ItemDescription: ['', [Validators.maxLength(500)]],
    ItemCategory: ['', [Validators.required, Validators.maxLength(40)]],
    ItemPrice: [0, [Validators.required, Validators.min(0)]],
    ItemImage: [''],
    ItemBadge: [''],
    IsAvailable: [true],
    IsActive: [true]
  });

  readonly trackByItem = (_index: number, item: MenuItem) => item.ItemID;

  getItemImage(item: MenuItem): string {
    const trimmed = item.ItemImage?.trim();
    return trimmed?.length ? trimmed : this.fallbackImagePath;
  }

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
          console.error('Menu load failed', err);
          return of<MenuItem[]>([]);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe(items => {
        this.menuItems.set(items);
        this.syncFormWithSelection();
      });
  }

  startEdit(item: MenuItem): void {
    this.selectedItemId.set(item.ItemID);
    this.editForm.patchValue(this.normalizeItemForForm(item));
  }

  cancelEdit(): void {
    this.selectedItemId.set(null);
    this.editForm.reset({
      ItemID: 0,
      ItemName: '',
      ItemDescription: '',
      ItemCategory: '',
      ItemPrice: 0,
      ItemImage: '',
      ItemBadge: '',
      IsAvailable: true,
      IsActive: true
    });
  }

  submitUpdate(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.lastUpdateMessage.set(null);

    const raw = this.editForm.getRawValue();
    const payload = {
      ...raw,
      ItemPrice: Number(raw.ItemPrice),
      ItemBadge: raw.ItemBadge?.trim() ? raw.ItemBadge.trim() : null
    };

    this.menuService
      .updateMenuItem(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          this.error.set('Updating this menu item failed. Please review the fields and try again.');
          console.error('Menu update failed', err);
          return of(null);
        }),
        finalize(() => this.saving.set(false))
      )
      .subscribe(result => {
        if (!result) {
          return;
        }

        const updatedItem: MenuItem = Array.isArray(result)
          ? result.find(item => item.ItemID === payload.ItemID) ?? (payload as MenuItem)
          : (result as MenuItem);

        this.menuItems.update(items =>
          items.map(item => (item.ItemID === updatedItem.ItemID ? { ...item, ...updatedItem } : item))
        );

        this.lastUpdateMessage.set('Menu item synced with ThaiOrange CMS.');
        this.syncFormWithSelection();
      });
  }

  quickToggleAvailability(item: MenuItem): void {
    const updated = { ...item, IsAvailable: !item.IsAvailable };
    this.startEdit(updated);
    this.submitUpdate();
  }

  private syncFormWithSelection(): void {
    const selection = this.selectedItem();
    if (!selection) {
      return;
    }

    this.editForm.patchValue(this.normalizeItemForForm(selection));
  }

  private normalizeItemForForm(item: MenuItem) {
    return {
      ...item,
      ItemBadge: item.ItemBadge ?? '',
      ItemDescription: item.ItemDescription ?? '',
      ItemImage: item.ItemImage ?? ''
    };
  }
}
