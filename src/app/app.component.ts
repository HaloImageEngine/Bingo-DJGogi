import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DashboardSummaryService } from './services/dashboard-summary.service';
import { DiscountService } from './services/discount.service';
import { Discount } from './models/discount.model';

type NavAccent = 'iris' | 'teal' | 'amber' | 'rose';

interface NavItem {
  label: string;
  helper: string;
  path: string;
  accent: NavAccent;
  icon: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface Highlight {
  title: string;
  value: string;
  detail: string;
  trend: 'up' | 'down' | 'flat';
  accent: NavAccent;
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly dashboardSummaryService = inject(DashboardSummaryService);
  private readonly discountService = inject(DiscountService);
  private readonly destroyRef = inject(DestroyRef);
  readonly controlRoomLabel = 'GogiTime Admin Dock';

  readonly navSections: NavSection[] = [

    {
      title: 'Operations',
      items: [
        { label: 'Menu Manager', helper: 'Dishes, bundles, pricing', path: '/menu-manager', accent: 'amber', icon: 'MM' },
        { label: 'Menu List', helper: 'List of All Items', path: '/menu-list', accent: 'teal', icon: 'ML' },
        { label: 'Discount List', helper: 'Discount codes & offers', path: '/discounts', accent: 'amber', icon: 'DC' },
        { label: 'Orders', helper: 'Orders In Queue', path: '/orders', accent: 'teal', icon: 'OR' },
        { label: 'Order-List', helper: 'Orders by status', path: '/order-list.components', accent: 'teal', icon: 'OL' },
        { label: 'Customers', helper: 'Community + loyalty', path: '/customers', accent: 'iris', icon: 'CU' },
        { label: 'Customer List', helper: 'Browse all customers', path: '/customer-list', accent: 'iris', icon: 'CL' },
        { label: 'Settings', helper: 'Automation + access', path: '/settings', accent: 'rose', icon: 'ST' }
      ]
    }
    ,
    {
      title: 'Intelligence',
      items: [
        { label: 'Overview', helper: 'Live KPIs & signals', path: '/overview', accent: 'iris', icon: 'OV' },
        { label: 'Marketing', helper: 'Campaign pacing & pulse', path: '/marketing', accent: 'rose', icon: 'MK', badge: 'LIVE' }
      ]
    },
  ];

  readonly utilityHighlights = computed<Highlight[]>(() => [
    {
      title: 'Live Orders',
      value: String(this.dashboardSummaryService.liveOrders()),
      detail: 'Current orders in the active list',
      trend: 'up',
      accent: 'teal'
    },
    {
      title: 'Avg. Ticket',
      value: this.formatCurrency(this.dashboardSummaryService.avgTicket()),
      detail: 'Total sales divided by live orders',
      trend: 'up',
      accent: 'amber'
    },
    {
      title: 'Marketing Push',
      value: `${this.dashboardSummaryService.marketingPushCount()} active`,
      detail: 'Active discounts from the discounts API',
      trend: 'flat',
      accent: 'rose'
    }
  ]);

  readonly liaison = {
    name: 'Ops Liaison · Riley',
    availability: 'On-call · response under 5m'
  };

  isSidebarOpen = false;
  isSidebarCollapsed = false;
  isInsightBandCollapsed = false;

  ngOnInit(): void {
    this.loadActiveDiscounts();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  toggleInsightBand(): void {
    this.isInsightBandCollapsed = !this.isInsightBandCollapsed;
  }

  private loadActiveDiscounts(): void {
    this.discountService
      .getAllDiscounts()
      .pipe(
        catchError(err => {
          console.error('Active discounts load failed', err);
          this.dashboardSummaryService.updateActiveDiscountsCount(0);
          return of<Discount[]>([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(discounts => {
        const list = Array.isArray(discounts) ? discounts : [];
        const activeCount = list.filter(discount => !!discount.IsActive).length;
        this.dashboardSummaryService.updateActiveDiscountsCount(activeCount);
      });
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}
