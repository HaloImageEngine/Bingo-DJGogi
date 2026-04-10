import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';

import { OrderFullDetailResponse, OrderStatus } from '../../models/order-list-item.model';
import { CurrentOrderService } from '../../services/current-order.service';
import { LoggerService } from '../../services/logger.service';
import { OrdersListService } from '../../services/orders-list.service';
import { StatusChangeComponent } from '../orders-list/statuschange.component';

type ChangeableOrderStatus = Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>;

@Component({
  selector: 'app-order-magnified',
  standalone: true,
  imports: [CommonModule, StatusChangeComponent],
  templateUrl: './order-magnified.component.html',
  styleUrl: './order-magnified.component.scss'
})
export class OrderMagnifiedComponent {
  private readonly ordersListService = inject(OrdersListService);
  private readonly currentOrderService = inject(CurrentOrderService);
  private readonly logger = inject(LoggerService);

  readonly orderId = computed(() => this.currentOrderService.currentOrderId());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly orderDetail = signal<OrderFullDetailResponse | null>(null);

  constructor() {
    effect(() => {
      const orderId = this.orderId();
      this.hydrateFromSharedSnapshot(orderId);
      this.loadOrderDetail(orderId);
    }, { allowSignalWrites: true });
  }

  onStatusChanged(status: ChangeableOrderStatus): void {
    const currentDetail = this.orderDetail();
    if (currentDetail?.Head) {
      const next = {
        ...currentDetail,
        Head: {
          ...currentDetail.Head,
          StatusCode: status.toUpperCase(),
          StatusName: status.charAt(0).toUpperCase() + status.slice(1)
        }
      };
      this.orderDetail.set(next);
      this.currentOrderService.setCurrentOrderDetail(next);
    }

    this.loadOrderDetail(this.orderId());
  }

  private hydrateFromSharedSnapshot(orderId: number | null): void {
    if (orderId === null) {
      this.orderDetail.set(null);
      return;
    }

    const inMemory = this.currentOrderService.currentOrderDetail();
    if (inMemory?.Head?.OrderID === orderId) {
      this.logger.log('🟡', '[HYDRATE] ✅ Found in-memory match, setting detail');
      this.orderDetail.set(inMemory);
      return;
    }

    const fromStore = this.currentOrderService.getStoredOrderDetailFor(orderId);
    if (fromStore?.Head?.OrderID === orderId) {
      this.logger.log('🟡', '[HYDRATE] ✅ Found stored match, setting detail');
    } else {
      this.logger.log('🟡', '[HYDRATE] Checking storage for OrderID:', orderId);
    }

    this.orderDetail.set(fromStore);
  }

  private loadOrderDetail(orderId: number | null): void {
    if (!orderId) {
      this.error.set(null);
      this.loading.set(false);
      return;
    }

    this.logger.log('🟠', '[LOAD START] Fetching OrderID:', orderId);
    this.loading.set(true);
    this.error.set(null);

    this.ordersListService
      .getOrderByIdFull(orderId)
      .pipe(
        catchError(err => {
          this.logger.error('🔴', '[LOAD ERROR]', err);
          this.error.set('Unable to load MAG ORDER details.');
          return of(null);
        }),
        finalize(() => {
          this.logger.log('🟠', '[LOAD FINALIZE] Setting loading=false');
          this.loading.set(false);
        })
      )
      .subscribe(result => {
        this.logger.log('🟠', '[LOAD RESULT]', {
          resultExists: !!result,
          headExists: !!result?.Head,
          orderId: result?.Head?.OrderID,
          lineItems: result?.OrderDetailsList?.length
        });

        if (result?.Head?.OrderID) {
          this.logger.log('🟠', '[LOAD] ✅ Valid result, setting detail');
          this.orderDetail.set(result);
          this.currentOrderService.setCurrentOrderDetail(result);
          return;
        }

        if (!this.orderDetail()) {
          this.logger.log('🟠', '[LOAD] ❌ No valid result and orderDetail is still null, setting error');
          this.error.set(`No detail data returned for OrderID ${orderId}.`);
        } else {
          this.logger.log('🟠', '[LOAD] Result was null but orderDetail has data from hydration');
        }
      });
  }
}
