import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface OrderEvent {
  time: string;
  useralias: string;
  detail: string;
  amount: string;
  status: 'pending' | 'preparing' | 'complete';
}

interface OrdersUpcoming {
  zone: string;
  load: string;
  couriers: string;
  eta: string;
  risk: 'ok' | 'watch' | 'delay';
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss']
})
export class OrdersComponent {
  readonly timeline: OrderEvent[] = [
    { time: '11:20', useralias: 'JamesMartin', detail: 'Order 210 - 2 bowls', amount: '$37.29', status: 'complete' },
    { time: '11:35', useralias: 'SarahChen', detail: 'Order 211 - 3 bowls + extras', amount: '$52.40', status: 'preparing' },
    { time: '11:42', useralias: 'MikeJohnson', detail: 'Order 212 - 1 bowl', amount: '$18.95', status: 'pending' },
    { time: '12:28', useralias: 'EmilyDavis', detail: 'Order 213 - 4 bowls', amount: '$68.15', status: 'complete' },

  ];

  readonly upcoming: OrdersUpcoming[] = [
    { zone: 'Downtown grid', load: '62 active', couriers: '18 riders', eta: '22 min avg', risk: 'ok' },
    { zone: 'Uptown loop', load: '34 active', couriers: '9 riders', eta: '27 min avg', risk: 'watch' },
    { zone: 'Brooklyn run', load: '41 active', couriers: '11 riders', eta: '25 min avg', risk: 'ok' },
    { zone: 'Queens express', load: '23 active', couriers: '6 riders', eta: '31 min avg', risk: 'delay' }
  ];
}
