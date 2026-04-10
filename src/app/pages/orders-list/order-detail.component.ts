import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';

import { OrderFullDetailResponse, OrderStatus } from '../../models/order-list-item.model';
import { CurrentOrderService } from '../../services/current-order.service';
import { OrdersListService } from '../../services/orders-list.service';
import { StatusChangeComponent } from './statuschange.component';

type ChangeableOrderStatus = Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>;

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, StatusChangeComponent],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.scss'
})
export class OrderDetailComponent implements OnChanges {
  private readonly ordersListService = inject(OrdersListService);
  private readonly currentOrderService = inject(CurrentOrderService);

  @Input() orderId: number | null = null;
  @Output() completeStatusApplied = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  orderDetail: OrderFullDetailResponse | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ('orderId' in changes) {
      this.currentOrderService.setCurrentOrderId(this.orderId);
      this.loadOrderDetail();
    }
  }

  onStatusChanged(status: ChangeableOrderStatus): void {
    if (this.orderDetail?.Head) {
      this.orderDetail = {
        ...this.orderDetail,
        Head: {
          ...this.orderDetail.Head,
          StatusCode: status.toUpperCase(),
          StatusName: status.charAt(0).toUpperCase() + status.slice(1)
        }
      };
      this.currentOrderService.setCurrentOrderDetail(this.orderDetail);
    }

    this.loadOrderDetail();

    if (status === 'complete') {
      this.completeStatusApplied.emit();
    }
  }

  private loadOrderDetail(): void {
    if (!this.orderId) {
      this.orderDetail = null;
      this.error = null;
      this.currentOrderService.setCurrentOrderDetail(null);
      return;
    }

    const stored = this.currentOrderService.getStoredOrderDetailFor(this.orderId);
    if (stored) {
      this.orderDetail = stored;
    }

    this.loading = true;
    this.error = null;

    this.ordersListService
      .getOrderByIdFull(this.orderId)
      .pipe(
        catchError(err => {
          console.error('Order detail load failed', err);
          this.error = 'Unable to load order details.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(result => {
        if (result?.Head?.OrderID) {
          this.orderDetail = result;
          this.currentOrderService.setCurrentOrderDetail(result);
          return;
        }

        if (!this.orderDetail) {
          this.error = `No detail data returned for OrderID ${this.orderId}.`;
        }
      });
  }
}