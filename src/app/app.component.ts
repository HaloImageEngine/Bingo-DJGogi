import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
export class AppComponent {
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

  readonly utilityHighlights: Highlight[] = [
    { title: 'Live Orders', value: '0', detail: '+12% vs last hour', trend: 'up', accent: 'teal' },
    { title: 'Avg. Ticket', value: '$0.00', detail: 'Chef collab adds +$2.40', trend: 'up', accent: 'amber' },
    { title: 'Marketing Push', value: '4 active', detail: '2 reviews queued', trend: 'flat', accent: 'rose' }
  ];

  readonly liaison = {
    name: 'Ops Liaison · Riley',
    availability: 'On-call · response under 5m'
  };

  isSidebarOpen = false;
  isSidebarCollapsed = false;

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
