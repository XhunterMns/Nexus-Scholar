import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  known = 0;
  unknown = 0;
  totalMs = 0;
  sessions = 0;

  @ViewChild('chart', { static: false }) chartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sessionsChart', { static: false }) sessionsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sparkline', { static: false }) sparklineRef!: ElementRef<HTMLCanvasElement>;

  // derived session arrays
  sessionDurationsMin: number[] = [];
  sessionDates: string[] = [];
  sessionsPerDay: number[] = [];

  constructor(private data: DataService) {}

  ngOnInit() {
    const cards = this.data.getCards();
    this.known = cards.filter(c => c.known === true).length;
    this.unknown = cards.filter(c => c.known === false).length;

    const sessions = this.data.getSessions();
    this.sessions = sessions.length;
    this.totalMs = sessions.reduce((s, r) => s + (r.durationMs || 0), 0);

    // build session duration array (minutes) and date labels (last N sessions)
    this.sessionDurationsMin = sessions.map(s => Math.round((s.durationMs || 0) / 60000));
    this.sessionDates = sessions.map(s => new Date(s.ts).toLocaleDateString());

    // compute sessions per day for the last 14 days
    const days = 14;
    const counts: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
      counts[d.toDateString()] = 0;
    }
    for (const s of sessions) {
      const key = new Date(s.ts).toDateString();
      if (key in counts) counts[key]++;
    }
    this.sessionsPerDay = Object.keys(counts).map(k => counts[k]);
  }

  ngAfterViewInit(): void {
    // Only draw on the client — server renderer doesn't implement canvas
    if (typeof window === 'undefined') return;
    // ensure view child is present
    if (!this.chartRef) return;
    setTimeout(() => {
      this.drawChart();
      if (this.sessionsChartRef) this.drawSessionsChart();
      if (this.sparklineRef) this.drawSparkline();
    }, 0);
  }

  get totalTimeString() {
    const s = Math.floor(this.totalMs / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  }

  private drawChart() {
    const canvas = this.chartRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const total = this.known + this.unknown || 1;
    const knownPct = this.known / total;
    const unknownPct = this.unknown / total;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    // background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();

    // known slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.fillStyle = '#10b981';
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + knownPct * Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // unknown slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.fillStyle = '#ef4444';
    ctx.arc(centerX, centerY, radius, -Math.PI / 2 + knownPct * Math.PI * 2, -Math.PI / 2 + (knownPct + unknownPct) * Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    // center label
    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(knownPct * 100)}% known`, centerX, centerY + radius + 20);
  }

  private drawSessionsChart() {
    const canvas = this.sessionsChartRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const data = this.sessionDurationsMin.slice(-8); // last 8 sessions
    if (data.length === 0) return;
    const max = Math.max(...data, 1);
    const pad = 20;
    const barWidth = (w - pad * 2) / data.length - 8;

    // draw bars
    data.forEach((v, i) => {
      const x = pad + i * (barWidth + 8);
      const barH = (v / max) * (h - pad * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x, h - pad - barH, barWidth, barH);
      // label
      ctx.fillStyle = '#999';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(v) + 'm', x + barWidth / 2, h - pad + 12);
    });
  }

  private drawSparkline() {
    const canvas = this.sparklineRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const data = this.sessionsPerDay;
    if (!data || data.length === 0) return;
    const max = Math.max(...data, 1);
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * (w - 10) + 5;
      const y = h - 5 - (v / max) * (h - 10);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
