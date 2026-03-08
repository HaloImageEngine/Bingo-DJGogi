import { Routes } from '@angular/router';
import { AuthGuard } from './services/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'overview' },
	{
		path: 'login',
		loadComponent: () =>
			import('./pages/login/login.component').then(m => m.LoginComponent)
	},
	{
		path: 'overview',
		loadComponent: () =>
			import('./pages/overview/overview.component').then(m => m.OverviewComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'menu-manager',
		loadComponent: () =>
			import('./pages/menu-manager/menu-manager.component').then(m => m.MenuManagerComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'menu-list',
		loadComponent: () =>
			import('./pages/menu-list/menu-list.component').then(m => m.MenuListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'menu-listps',
		loadComponent: () =>
			import('./pages/menu-listps/menu-listps.component').then(m => m.MenuListpsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'menu-listbv',
		loadComponent: () =>
			import('./pages/menu-listbv/menu-listbv.component').then(m => m.MenuListbvComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'marketing',
		loadComponent: () =>
			import('./pages/marketing/marketing.component').then(m => m.MarketingComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'orders',
		loadComponent: () =>
			import('./pages/orders/orders.component').then(m => m.OrdersComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'customers',
		loadComponent: () =>
			import('./pages/customers/customers.component').then(m => m.CustomersComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'customer-list',
		loadComponent: () =>
			import('./pages/customers/customer.component').then(m => m.CustomerComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'settings',
		loadComponent: () =>
			import('./pages/settings/settings.component').then(m => m.SettingsComponent),
		canActivate: [AuthGuard]
	},
	{ path: '**', redirectTo: 'overview' }
];
