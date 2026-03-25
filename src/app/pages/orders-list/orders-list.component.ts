import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, interval, of } from 'rxjs';

import { OrderListItem, OrderStatus } from '../../models/order-list-item.model';
import { DashboardSummaryService } from '../../services/dashboard-summary.service';
import { OrdersListService } from '../../services/orders-list.service';
import { OrderDetailComponent } from './orderdetail.component';
import { environment } from '../../../environments/environment';

interface StatusOption {
  label: string;
  value: OrderStatus;
}

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderDetailComponent],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss'
})
export class OrdersListComponent implements OnInit, OnDestroy {
  private readonly ordersListService = inject(OrdersListService);
  private readonly dashboardSummaryService = inject(DashboardSummaryService);
  private readonly destroyRef = inject(DestroyRef);
  private isRefreshing = false;
  private readonly ordersRefreshIntervalMs = environment.ordersRefreshIntervalSeconds * 1000;

  readonly statusOptions: StatusOption[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Complete', value: 'complete' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Ready', value: 'ready' },
    { label: 'Preparing', value: 'preparing' }
  ];

  readonly selectedStatus = signal<OrderStatus>('pending');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderListItem[]>([]);
  readonly selectedOrder = signal<OrderListItem | null>(null);
  readonly fullscreen = signal(false);

  readonly totalOrders = computed(() => this.orders().length);
  readonly totalItems = computed(() => this.orders().reduce((sum, order) => sum + (order.ItemCount || 0), 0));
  readonly totalSales = computed(() => this.orders().reduce((sum, order) => sum + (order.TotalAmount || 0), 0));

  readonly trackByOrderId = (_index: number, order: OrderListItem) => order.OrderID;

  ngOnInit(): void {
    this.loadOrders();

    interval(this.ordersRefreshIntervalMs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadOrders(false));
  }

  onStatusChange(): void {
    this.loadOrders();
  }

  toggleFullscreen(): void {
    const next = !this.fullscreen();
    this.fullscreen.set(next);
    document.body.classList.toggle('workspace-expanded', next);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('workspace-expanded');
  }

  selectOrder(order: OrderListItem): void {
    this.selectedOrder.set(order);
  }

  formatCreatedAt(order: OrderListItem): string {
    if (order.CreatedAt && !order.CreatedAt.startsWith('0001-01-01')) {
      const createdAt = new Date(order.CreatedAt);
      if (!Number.isNaN(createdAt.getTime())) {
        return createdAt.toLocaleString();
      }
    }

    // Fallback: parse ORD-YYYYMMDDHHMMSS from order number when CreatedAt is defaulted.
    const match = order.OrderNumber?.match(/ORD-(\d{14})/);
    if (!match) {
      return '-';
    }

    const stamp = match[1];
    const year = Number(stamp.slice(0, 4));
    const month = Number(stamp.slice(4, 6)) - 1;
    const day = Number(stamp.slice(6, 8));
    const hour = Number(stamp.slice(8, 10));
    const minute = Number(stamp.slice(10, 12));
    const second = Number(stamp.slice(12, 14));

    const parsed = new Date(year, month, day, hour, minute, second);
    if (Number.isNaN(parsed.getTime())) {
      return '-';
    }

    return parsed.toLocaleString();
  }

  onCompleteStatusApplied(): void {
    this.loadOrders();
  }

  private loadOrders(showLoading = true): void {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    if (showLoading) {
      this.loading.set(true);
    }

    this.error.set(null);

    this.ordersListService
      .getOrdersByStatus(this.selectedStatus())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(err => {
          console.error('Orders by status load failed', err);
          this.error.set('Unable to load orders. Please try again.');
          return of<OrderListItem[]>([]);
        }),
        finalize(() => {
          this.isRefreshing = false;
          if (showLoading) {
            this.loading.set(false);
          }
        })
      )
      .subscribe(items => {
        const list = Array.isArray(items) ? items : [];
        const selectedOrderId = this.selectedOrder()?.OrderID ?? null;
        this.orders.set(list);
        this.dashboardSummaryService.updateOrders(list);

        if (selectedOrderId === null) {
          this.selectedOrder.set(list.length ? list[0] : null);
          return;
        }

        const matchingOrder = list.find(order => order.OrderID === selectedOrderId);
        this.selectedOrder.set(matchingOrder ?? (list.length ? list[0] : null));
      });
  }
}
