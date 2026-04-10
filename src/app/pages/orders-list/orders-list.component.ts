import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, interval, of } from 'rxjs';

import { OrderListItem, OrderStatus } from '../../models/order-list-item.model';
import { CurrentOrderService } from '../../services/current-order.service';
import { DashboardSummaryService } from '../../services/dashboard-summary.service';
import { OrdersListService } from '../../services/orders-list.service';
import { OrderDetailComponent } from './order-detail.component';
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
  private readonly currentOrderService = inject(CurrentOrderService);
  private readonly dashboardSummaryService = inject(DashboardSummaryService);
  private readonly destroyRef = inject(DestroyRef);
  private isRefreshing = false;
  private readonly ordersRefreshIntervalMs = environment.ordersRefreshIntervalSeconds * 1000;
  private newOrderPopupTimer: ReturnType<typeof setTimeout> | null = null;

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
  readonly newOrderCount = signal(0);
  readonly showNewOrderPopup = signal(false);

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
    this.clearNewOrderPopupTimer();
  }

  selectOrder(order: OrderListItem): void {
    this.updateSelectedOrder(order);
  }

  formatCreatedAt(order: OrderListItem): string {
    if (order.CreatedAt && !order.CreatedAt.startsWith('0001-01-01')) {
      const createdAt = new Date(order.CreatedAt);
      if (!Number.isNaN(createdAt.getTime())) {
        return this.formatTimeDate(createdAt);
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

    return this.formatTimeDate(parsed);
  }

  private formatTimeDate(value: Date): string {
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const year = String(value.getFullYear()).slice(-2);

    return `${hh}:${mm} ${month}/${day}/${year}`;
  }

  onCompleteStatusApplied(): void {
    this.loadOrders();
  }

  dismissNewOrderPopup(): void {
    this.showNewOrderPopup.set(false);
    this.newOrderCount.set(0);
    this.clearNewOrderPopupTimer();
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
        const previousOrderIds = new Set(this.orders().map(order => order.OrderID));
        const incomingOrderCount = showLoading
          ? 0
          : list.filter(order => !previousOrderIds.has(order.OrderID)).length;
        const selectedOrderId = this.currentOrderService.currentOrderId() ?? this.selectedOrder()?.OrderID ?? null;

        if (incomingOrderCount > 0) {
          this.triggerNewOrderPopup(incomingOrderCount);
        }

        this.orders.set(list);
        this.dashboardSummaryService.updateOrders(list);

        if (selectedOrderId === null) {
          this.updateSelectedOrder(list.length ? list[0] : null);
          return;
        }

        const matchingOrder = list.find(order => order.OrderID === selectedOrderId);
        this.updateSelectedOrder(matchingOrder ?? (list.length ? list[0] : null));
      });
  }

  private updateSelectedOrder(order: OrderListItem | null): void {
    this.selectedOrder.set(order);
    this.currentOrderService.setCurrentOrderId(order?.OrderID ?? null);
  }

  private triggerNewOrderPopup(incomingOrderCount: number): void {
    this.newOrderCount.set(incomingOrderCount);
    this.showNewOrderPopup.set(true);
    this.clearNewOrderPopupTimer();
    this.newOrderPopupTimer = setTimeout(() => {
      this.showNewOrderPopup.set(false);
      this.newOrderCount.set(0);
      this.newOrderPopupTimer = null;
    }, 12000);
  }

  private clearNewOrderPopupTimer(): void {
    if (this.newOrderPopupTimer !== null) {
      clearTimeout(this.newOrderPopupTimer);
      this.newOrderPopupTimer = null;
    }
  }
}
