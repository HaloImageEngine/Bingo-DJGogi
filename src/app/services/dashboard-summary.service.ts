import { computed, Injectable, signal } from '@angular/core';

import { OrderListItem } from '../models/order-list-item.model';

@Injectable({ providedIn: 'root' })
export class DashboardSummaryService {
  private readonly liveOrdersCount = signal(0);
  private readonly totalSalesAmount = signal(0);
  private readonly activeDiscountsCount = signal(0);

  readonly liveOrders = computed(() => this.liveOrdersCount());
  readonly avgTicket = computed(() => {
    const liveOrders = this.liveOrdersCount();
    if (liveOrders <= 0) {
      return 0;
    }

    return this.totalSalesAmount() / liveOrders;
  });
  readonly marketingPushCount = computed(() => this.activeDiscountsCount());

  updateOrders(items: OrderListItem[]): void {
    const list = Array.isArray(items) ? items : [];
    this.liveOrdersCount.set(list.length);
    this.totalSalesAmount.set(list.reduce((sum, order) => sum + (order.TotalAmount || 0), 0));
  }

  updateActiveDiscountsCount(count: number): void {
    this.activeDiscountsCount.set(Math.max(0, count));
  }
}
