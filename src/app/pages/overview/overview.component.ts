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

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent {
  readonly metrics: Metric[] = [
    { label: 'Kitchen throughput', value: '312 plates/hr', change: '+8% vs yesterday', trend: 'up', note: 'Third prep line online' },
    { label: 'Delivery promise', value: '24 min avg', change: '-2 min vs target', trend: 'up', note: 'City-core courier stack healthy' },
    { label: 'Customer sentiment', value: '4.82 ★', change: '12 new reviews', trend: 'flat', note: 'Highlight chefs table collab' },
    { label: 'Inventory buffer', value: '3.4 hrs', change: '-0.4 hr vs goal', trend: 'down', note: 'Need protein restock at 15:00' }
  ];

  readonly activityFeed: ActivityItem[] = [
    { time: '11:12', owner: 'Menu Ops', detail: 'Activated lunch tasting bundle for downtown.' },
    { time: '11:05', owner: 'Marketing', detail: 'Approved push copy for office micro-campaign.' },
    { time: '10:58', owner: 'Kitchen', detail: 'Flagged low kimchi reserve, alert sent to purchasing.' },
    { time: '10:44', owner: 'Customers', detail: 'VIP feedback captured, awaiting follow-up draft.' }
  ];

  readonly readinessChecks: ReadinessItem[] = [
    { label: 'Line cooks staffed', status: 'ready', note: '6 of 6 kitchen pods online' },
    { label: 'Courier capacity', status: 'watch', note: '2 riders delayed near Midtown' },
    { label: 'Menu QA', status: 'ready', note: 'Allergens + pricing confirmed' },
    { label: 'Promo assets', status: 'risk', note: 'Need final art for evening drop' }
  ];

  readonly pipeline: PipelineStage[] = [
    { stage: 'Prep & mise', status: 'On track', detail: 'Batch 3 veggies inbound in 12 min' },
    { stage: 'Cooking', status: 'High flow', detail: 'Skillets 1-4 synced with expo' },
    { stage: 'Packaging', status: 'Watch', detail: 'Label printer warming up again' },
    { stage: 'Courier handoff', status: 'Green', detail: 'Rider staging area clear' }
  ];
}
