import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
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
  hidden?: boolean;
}


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private brandCardTimerId: number | undefined;
  readonly controlRoomLabel = 'Music Bingo Admin';
  readonly brandCardImagePath = 'assets/images/DJGogi.png';

  readonly navSections: NavSection[] = [

    {
      title: 'Operations',
      items: [
        { label: 'Console', helper: 'Bingo game console', path: '/console', accent: 'rose', icon: 'BC' },
        { label: 'Create CallList Master', helper: 'Pick songs into a custom list', path: '/console/create-master-withsonglist', accent: 'rose', icon: 'CL' },
        { label: 'Edit CallList Master', helper: 'Edit an existing call list', path: '/console/edit-song-list', accent: 'rose', icon: 'EL' },
        { label: 'Review Call List', helper: 'Review the call list with songs', path: '/console/create-call-list', accent: 'rose', icon: 'RL' },
        { label: 'CL Song Review', helper: 'Call list songs in 4 inning columns', path: '/console/clsong-review', accent: 'rose', icon: 'SR' },
        { label: 'Slide Cards', helper: 'Landscape swipe card pairs', path: '/slidecards', accent: 'teal', icon: 'SC' },
        { label: 'Slide Card One', helper: 'Single printed bingo card', path: '/slidecardone', accent: 'teal', icon: 'S1' },
        { label: 'Card Master', helper: 'Review printed cards by game', path: '/console/card-master', accent: 'teal', icon: 'CM' },
        { label: 'Game Master', helper: 'Load game context (GCI)', path: '/console/game-master', accent: 'teal', icon: 'GM' },
        { label: 'Songs', helper: 'Browse bingo song library', path: '/console/songs', accent: 'teal', icon: 'SG' },
        { label: 'Insert Song', helper: 'Add one song with lookup dropdowns', path: '/console/insert-song-single', accent: 'amber', icon: 'IS' },
        { label: 'Bulk Insert', helper: 'Paste JSON to add many songs', path: '/console/insert-song-bulk', accent: 'amber', icon: 'BI' },

        { label: 'Cards', helper: 'Two bingo cards view', path: '/cards', accent: 'amber', icon: 'CD' },
        //{ label: 'MB Schema', helper: 'Music bingo data map', path: '/music-bingo-schema', accent: 'iris', icon: 'DB' },
        //{ label: 'MB Guidelines', helper: 'Music bingo chat transcript', path: '/music-bingo-guideline', accent: 'iris', icon: 'MG' },

        //{ label: 'Settings', helper: 'Automation + access', path: '/settings', accent: 'rose', icon: 'ST' }
      ]
    }
    ,
    {
      title: 'Intelligence',
      hidden: true,
      items: [
        { label: 'Overview', helper: 'Live KPIs & signals', path: '/overview', accent: 'iris', icon: 'OV' },
        { label: 'Marketing', helper: 'Campaign pacing & pulse', path: '/marketing', accent: 'rose', icon: 'MK', badge: 'LIVE' }
      ]
    },
  ];

  isSidebarOpen = false;
  isSidebarCollapsed = false;
  showBrandCardImage = true;

  ngOnInit(): void {
    this.brandCardTimerId = window.setTimeout(() => {
      this.showBrandCardImage = false;
    }, 4000);

    this.destroyRef.onDestroy(() => {
      if (this.brandCardTimerId !== undefined) {
        window.clearTimeout(this.brandCardTimerId);
      }
    });
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
}
