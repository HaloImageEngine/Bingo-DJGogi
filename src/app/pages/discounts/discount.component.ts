import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { Discount } from '../../models/discount.model';
import { DashboardSummaryService } from '../../services/dashboard-summary.service';
import { DiscountService } from '../../services/discount.service';

@Component({
  selector: 'app-discount',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './discount.component.html',
  styleUrl: './discount.component.scss'
})
export class DiscountComponent implements OnInit {
  private readonly discountService = inject(DiscountService);
  private readonly dashboardSummaryService = inject(DashboardSummaryService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  readonly discounts = signal<Discount[]>([]);
  readonly editingDiscount = signal<Discount | null>(null);

  editForm!: FormGroup;

  readonly trackById = (_i: number, d: Discount) => d.ItemDiscountID;

  ngOnInit(): void {
    this.loadDiscounts();
  }

  private loadDiscounts(): void {
    this.loading.set(true);
    this.error.set(null);
    this.discountService.getAllDiscounts()
      .pipe(
        catchError(err => {
          this.error.set(err?.message ?? 'Failed to load discounts.');
          return of([]);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(data => {
        const list = Array.isArray(data) ? data : [];
        this.discounts.set(list);
        this.updateActiveDiscountSummary(list);
      });
  }

  openEdit(discount: Discount): void {
    this.saveError.set(null);
    this.saveSuccess.set(false);
    this.editingDiscount.set({ ...discount });
    this.editForm = this.fb.group({
      DiscountCode: [discount.DiscountCode, [Validators.required, Validators.maxLength(50)]],
      DiscountName: [discount.DiscountName, [Validators.required, Validators.maxLength(100)]],
      DiscountAmount: [discount.DiscountAmount, [Validators.required, Validators.min(0)]],
      SortOrder: [discount.SortOrder, [Validators.required, Validators.min(0)]],
      IsActive: [discount.IsActive]
    });
  }

  cancelEdit(): void {
    this.editingDiscount.set(null);
    this.saveError.set(null);
    this.saveSuccess.set(false);
  }

  saveEdit(): void {
    if (this.editForm.invalid) return;
    const current = this.editingDiscount();
    if (!current) return;

    const payload: Discount = {
      ...current,
      ...this.editForm.value
    };

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.discountService.saveDiscount(payload)
      .pipe(
        catchError(err => {
          this.saveError.set(err?.message ?? 'Save failed.');
          return of(null);
        }),
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(result => {
        if (result !== null || !this.saveError()) {
          this.saveSuccess.set(true);
          this.discounts.update(list => {
            const updatedList = list.map(d => (d.ItemDiscountID === payload.ItemDiscountID ? payload : d));
            this.updateActiveDiscountSummary(updatedList);
            return updatedList;
          });
          setTimeout(() => {
            this.editingDiscount.set(null);
            this.saveSuccess.set(false);
          }, 1200);
        }
      });
  }

  private updateActiveDiscountSummary(discounts: Discount[]): void {
    const activeCount = discounts.filter(discount => !!discount.IsActive).length;
    this.dashboardSummaryService.updateActiveDiscountsCount(activeCount);
  }
}
