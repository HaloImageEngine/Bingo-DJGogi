import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';

import { OrderFullDetailResponse, OrderStatus } from '../../models/order-list-item.model';
import { OrdersListService } from '../../services/orders-list.service';
import { StatusChangeComponent } from './statuschange.component';

type ChangeableOrderStatus = Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>;

@Component({
  selector: 'app-orderdetail',
  standalone: true,
  imports: [CommonModule, StatusChangeComponent],
  templateUrl: './orderdetail.component.html',
  styleUrl: './orderdetail.component.scss'
})
export class OrderDetailComponent implements OnChanges {
  private readonly ordersListService = inject(OrdersListService);

  @Input() orderId: number | null = null;
  @Output() completeStatusApplied = new EventEmitter<void>();

  loading = false;
  error: string | null = null;
  orderDetail: OrderFullDetailResponse | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ('orderId' in changes) {
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
      return;
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
        this.orderDetail = result;
      });
  }
}
