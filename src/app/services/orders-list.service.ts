import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { OrderFullDetailResponse, OrderListItem, OrderStatus } from '../models/order-list-item.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersListService {
  private readonly http = inject(HttpClient);
  private readonly ordersByStatusUrl = `${environment.ordersApiBaseUrl}/Get_OrdersbyStatus`;
  private readonly orderByIdFullUrl = `${environment.ordersApiBaseUrl}/Get_OrderbyOrderIdFull_HeadandDetails`;
  private readonly updateOrderStatusUrl = environment.ordersStatusChangeApiUrl;

  getOrdersByStatus(status: OrderStatus): Observable<OrderListItem[]> {
    const params = new HttpParams().set('status', status.toUpperCase());
    return this.http.get<OrderListItem[]>(this.ordersByStatusUrl, { params });
  }

  getOrderByIdFull(orderId: number): Observable<OrderFullDetailResponse> {
    const params = new HttpParams().set('OrderId', orderId);
    return this.http.get<OrderFullDetailResponse>(this.orderByIdFullUrl, { params });
  }

  updateOrderStatus(orderId: number, status: Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>): Observable<unknown> {
    const payload = {
      OrderID: orderId,
      StatusCode: this.toApiStatusCode(status)
    };

    return this.http.post<unknown>(this.updateOrderStatusUrl, payload);
  }

  private toApiStatusCode(status: Extract<OrderStatus, 'complete' | 'preparing' | 'ready'>): string {
    return `${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`;
  }
}
