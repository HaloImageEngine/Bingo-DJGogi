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
	{
		path: 'cards',
		loadComponent: () =>
			import('./pages/cards/cards.component').then(m => m.CardsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'slidecards',
		loadComponent: () =>
			import('./pages/slidecardsw/slidecardsw.component').then(m => m.SlidecardswComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'slidecardone',
		loadComponent: () =>
			import('./pages/slidecardone/slidecardone.component').then(m => m.SlidecardoneComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/songs',
		loadComponent: () =>
			import('./pages/songs/songslist.component').then(m => m.SongsListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/create-song-list',
		loadComponent: () =>
			import('./pages/createsonglist/createsonglist.component').then(m => m.CreateSongListComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console/songs/:songId',
		loadComponent: () =>
			import('./pages/songs/songdetail.component').then(m => m.SongDetailComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'console',
		loadComponent: () =>
			import('./pages/console/console.component').then(m => m.ConsoleComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'thumbnails',
		loadComponent: () =>
			import('./pages/thumbnails/thumbnails.component').then(m => m.ThumbnailsComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'thumbnail-detail/:id',
		loadComponent: () =>
			import('./pages/thumbnail-detail/thumbnail-detail.component').then(m => m.ThumbnailDetailComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'music-bingo-schema',
		loadComponent: () =>
			import('./pages/music-bingo-schema/music-bingo-schema.component').then(m => m.MusicBingoSchemaComponent),
		canActivate: [AuthGuard]
	},
	{
		path: 'music-bingo-guideline',
		loadComponent: () =>
			import('./pages/music-bingo-guideline/music-bingo-guideline.component').then(m => m.MusicBingoGuidelineComponent),
		canActivate: [AuthGuard]
	},
	{ path: 'app/music_bingo_schema.html', redirectTo: 'music-bingo-schema', pathMatch: 'full' },
	{ path: 'app/music_bingo_chat.html', redirectTo: 'music-bingo-guideline', pathMatch: 'full' },
	{ path: '**', redirectTo: 'overview' }
];
