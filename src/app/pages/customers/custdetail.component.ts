import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  selector: 'app-custdetail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custdetail.component.html',
  styleUrl: './custdetail.component.scss'
})
export class CustDetailComponent {
  @Input() customer: Customer | null = null;
}
