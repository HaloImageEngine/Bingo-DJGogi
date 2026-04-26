import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

type Trend = 'up' | 'down' | 'flat';

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: Trend;
  note: string;
}

interface ActivityItem {
  time: string;
  owner: string;
  detail: string;
}

interface ReadinessItem {
  label: string;
  status: 'ready' | 'watch' | 'risk';
  note: string;
}

interface PipelineStage {
  stage: string;
  status: string;
  detail: string;
}

interface SpotlightStat {
  label: string;
  value: string;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent {
  readonly spotlightStats: SpotlightStat[] = [
    { label: 'Current round', value: 'Round 3 · Crowd Favorites' },
    { label: 'Now spinning', value: 'Whitney Houston - I Wanna Dance with Somebody' },
    { label: 'Jackpot pattern', value: 'Neon X with free center' }
  ];

  readonly metrics: Metric[] = [
    { label: 'Cards in play', value: '148 boards', change: '+18 walk-ins since last game', trend: 'up', note: 'Main floor nearly full' },
    { label: 'Song bank ready', value: '96 tracks', change: '4 bonus cuts queued', trend: 'up', note: 'Mix spans disco, pop, and 90s throwbacks' },
    { label: 'Crowd energy', value: '9.2 / 10', change: 'Steady through two rounds', trend: 'flat', note: 'Biggest reaction on sing-along hooks' },
    { label: 'Prize table', value: '6 wins left', change: '2 headline prizes already claimed', trend: 'down', note: 'Refill minis before blackout round' }
  ];

  readonly activityFeed: ActivityItem[] = [
    { time: '7:12 PM', owner: 'Caller Booth', detail: 'Locked in Round 3 playlist and pushed the next three song hints to screens.' },
    { time: '7:05 PM', owner: 'Floor Host', detail: 'Opened a bonus dabber giveaway for the front-row tables.' },
    { time: '6:58 PM', owner: 'DJ Desk', detail: 'Crossfade timing tightened after the last chorus-heavy round.' },
    { time: '6:44 PM', owner: 'Prize Runner', detail: 'Delivered the first blackout basket to Table 12.' }
  ];

  readonly readinessChecks: ReadinessItem[] = [
    { label: 'Audio mix', status: 'ready', note: 'Room levels balanced for booth, bar, and patio' },
    { label: 'Wildcard stack', status: 'watch', note: 'Only one decade-switch round left in reserve' },
    { label: 'Prize desk', status: 'ready', note: 'Gift cards, merch, and bonus drinks logged' },
    { label: 'Late arrivals', status: 'risk', note: 'Need three spare boards held near the door' }
  ];

  readonly pipeline: PipelineStage[] = [
    { stage: 'Doors Open', status: 'Complete', detail: 'Check-in, card pickup, and warm-up playlist wrapped on time' },
    { stage: 'Round One', status: 'Complete', detail: 'Classic hooks round finished with two line winners' },
    { stage: 'Wildcard Round', status: 'Live', detail: 'Decade shuffle is running with bonus stamp calls' },
    { stage: 'Blackout Finale', status: 'Queued', detail: 'Grand prize reveal follows the last power ballad' }
  ];
}
