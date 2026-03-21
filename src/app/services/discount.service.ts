import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Discount } from '../models/discount.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DiscountService {
  private readonly http = inject(HttpClient);
  private readonly getAllUrl = `${environment.menuApiBaseUrl}/Get_All_Discounts`;
  private readonly crudUrl = `${environment.menuApiBaseUrl}/CRUD_Discounts`;

  getAllDiscounts(): Observable<Discount[]> {
    const params = new HttpParams().set('discount', 'ALL');
    return this.http.get<Discount[]>(this.getAllUrl, { params });
  }

  saveDiscount(discount: Discount): Observable<unknown> {
    return this.http.post<unknown>(this.crudUrl, discount);
  }
}
