import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { catchError, filter, finalize, of } from 'rxjs';

import { OrderStatus } from '../../models/order-list-item.model';
import { OrdersListService } from '../../services/orders-list.service';

type ChangeableOrderStatus = Extract<OrderStatus, 'complete' | 'ready'>;

@Component({
  selector: 'app-status-change',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statuschange.component.html',
  styleUrl: './statuschange.component.scss'
})
export class StatusChangeComponent {
  private readonly ordersListService = inject(OrdersListService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  @Input() orderId: number | null = null;
  @Input() currentStatus = '';
  @Output() statusChanged = new EventEmitter<ChangeableOrderStatus>();

  updating = false;
  error: string | null = null;
  success: string | null = null;
  readonly onMagnifiedPage = signal(this.isMagnifiedUrl(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.onMagnifiedPage.set(this.isMagnifiedUrl(event.urlAfterRedirects));
      });
  }

  get viewToggleLabel(): string {
    return this.onMagnifiedPage() ? 'List View' : 'Mag View';
  }

  isCurrentStatus(status: ChangeableOrderStatus): boolean {
    return this.currentStatus.toUpperCase() === status.toUpperCase();
  }

  goToAlternateView(): void {
    void this.router.navigateByUrl(this.onMagnifiedPage() ? '/order-list' : '/order-magnified');
  }

  changeStatus(status: ChangeableOrderStatus): void {
    if (!this.orderId || this.updating) {
      return;
    }

    this.updating = true;
    this.error = null;
    this.success = null;

    if (status === 'complete') {
      console.log(`Complete clicked for OrderID ${this.orderId}: sending status change REST API request.`);
    }

    if (status === 'ready') {
      console.log(`Ready clicked for OrderID ${this.orderId}: sending status change REST API request.`);
    }

    this.ordersListService
      .updateOrderStatus(this.orderId, status)
      .pipe(
        catchError(err => {
          console.error('Order status update failed', err);
          this.error = 'Failed to update status.';
          return of(null);
        }),
        finalize(() => {
          this.updating = false;
        })
      )
      .subscribe(result => {
        if (!this.isGoodResponse(result)) {
          this.error = this.extractFailureMessage(result);
          return;
        }

        this.success = this.extractSuccessMessage(result, status);
        this.statusChanged.emit(status);
      });
  }

  private isGoodResponse(response: unknown): boolean {
    if (response == null) {
      // HTTP 200 with empty body is accepted as success for this endpoint.
      return true;
    }

    if (typeof response === 'string') {
      const normalized = response.toLowerCase();
      if (normalized.includes('error') || normalized.includes('fail')) {
        return false;
      }

      return true;
    }

    if (typeof response === 'object') {
      const record = response as Record<string, unknown>;

      if (typeof record['success'] === 'boolean') {
        return record['success'];
      }

      if (typeof record['isSuccess'] === 'boolean') {
        return record['isSuccess'];
      }

      if (typeof record['ok'] === 'boolean') {
        return record['ok'];
      }

      if (typeof record['status'] === 'number') {
        return record['status'] >= 200 && record['status'] < 300;
      }

      if (typeof record['statusCode'] === 'number') {
        return record['statusCode'] >= 200 && record['statusCode'] < 300;
      }

      if (typeof record['message'] === 'string') {
        const normalized = record['message'].toLowerCase();
        if (normalized.includes('error') || normalized.includes('fail')) {
          return false;
        }
      }
    }

    return true;
  }

  private extractSuccessMessage(response: unknown, status: ChangeableOrderStatus): string {
    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      if (typeof record['message'] === 'string' && record['message'].trim().length > 0) {
        return `Status update succeeded: ${record['message']}`;
      }
    }

    return `Status change request sent successfully for ${status.toUpperCase()}.`;
  }

  private extractFailureMessage(response: unknown): string {
    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      if (typeof record['message'] === 'string' && record['message'].trim().length > 0) {
        return `Status update failed: ${record['message']}`;
      }
    }

    if (typeof response === 'string' && response.trim().length > 0) {
      return `Status update failed: ${response}`;
    }

    return 'Status update failed: API response was not valid.';
  }

  private isMagnifiedUrl(url: string): boolean {
    return url.startsWith('/order-magnified') || url.startsWith('/mag-order');
  }
}
