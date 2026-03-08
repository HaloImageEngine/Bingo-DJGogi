import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Campaign {
  name: string;
  goal: string;
  pacing: string;
  spend: string;
  status: 'healthy' | 'watch' | 'hold';
}

interface ChannelStat {
  channel: string;
  reach: string;
  cost: string;
  insight: string;
}

@Component({
  selector: 'app-marketing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketing.component.html',
  styleUrl: './marketing.component.scss'
})
export class MarketingComponent {
  readonly campaigns: Campaign[] = [
    { name: 'Office pulse', goal: 'Lunch conversions', pacing: '+6% ahead', spend: '$1.2K / $4K', status: 'healthy' },
    { name: 'Chef story drop', goal: 'Evening hype', pacing: 'Need assets', spend: '$640 / $3K', status: 'hold' },
    { name: 'Courier hero', goal: 'Brand lift', pacing: 'On plan', spend: '$820 / $2K', status: 'watch' }
  ];

  readonly channelStats: ChannelStat[] = [
    { channel: 'SMS', reach: '8.2K sends', cost: '$0.035 per', insight: 'High lunch engagement, resend at 3pm.' },
    { channel: 'Email', reach: '15.4K inbox', cost: '$0.012 per', insight: 'Menu stories drive 29% CTR.' },
    { channel: 'Paid social', reach: '62K impressions', cost: '$0.048 per', insight: 'Need new creative for late-night slot.' }
  ];
}
