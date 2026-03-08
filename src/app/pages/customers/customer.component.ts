import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CustDetailComponent } from './custdetail.component';

interface Customer {
  UserId: number;
  UserAlias: string;
  UserName: string;
  DisplayName: string;
  PhoneNumber: string | null;
  IsActive: boolean;
  FirstName: string;
  MiddleInitial: string;
  LastName: string;
  City: string | null;
  State: string | null;
  Zip: string;
  EmailAddress: string;
  ReadPW: string;
}

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [CommonModule, HttpClientModule, CustDetailComponent],
  templateUrl: './customer.component.html',
  styleUrl: './customer.component.scss'
})
export class CustomerComponent implements OnInit {
  customers: Customer[] = [];
  loading = true;
  error: string | null = null;
  selectedCustomer: Customer | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http.get<Customer[]>('https://api.getgogi.com/api/CMSDemo/User/GetUserbyUserUserAll?useralias=All')
      .subscribe({
        next: (data) => {
          this.customers = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load customers.';
          this.loading = false;
        }
      });
  }

  selectCustomer(customer: Customer): void {
    this.selectedCustomer = customer;
  }
}
