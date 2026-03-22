import { Component, OnInit, OnDestroy } from '@angular/core';
import { DataService } from '../../services/data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pomodoro',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pomodoro.component.html',
  //styleUrl: './pomodoro.component.css'
})
export class PomodoroComponent implements OnInit, OnDestroy {
  timeLeft = 0;
  interval: ReturnType<typeof setInterval> | null = null;
  private startTime: number | null = null;

  constructor(private data: DataService) {}

  ngOnInit() {
    const storedEnd = localStorage.getItem('pomodoro_end');
    const storedStart = localStorage.getItem('pomodoro_start');
    if (storedStart) this.startTime = Number(storedStart) || null;
    if (storedEnd) this.runTimer(); // will compute remaining
  }

  ngOnDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  start(seconds: number) {
    // ensure previous interval cleared
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const now = Date.now();
    const endTime = now + seconds * 1000;
    this.startTime = now;
    localStorage.setItem('pomodoro_start', String(now));
    localStorage.setItem('pomodoro_end', String(endTime));
    this.runTimer();
  }

  runTimer() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.interval = setInterval(() => {
      const raw = localStorage.getItem('pomodoro_end');
      if (!raw) {
        this.timeLeft = 0;
        clearInterval(this.interval!);
        this.interval = null;
        return;
      }

      const end = Number(raw);
      if (!Number.isFinite(end)) {
        // invalid stored value — cleanup
        localStorage.removeItem('pomodoro_end');
        this.timeLeft = 0;
        clearInterval(this.interval!);
        this.interval = null;
        return;
      }

      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      this.timeLeft = diff;

      if (diff <= 0) {
        clearInterval(this.interval!);
        this.interval = null;
        localStorage.removeItem('pomodoro_end');
        const storedStart = localStorage.getItem('pomodoro_start');
        let durationMs = 0;
        if (storedStart) {
          const s = Number(storedStart);
          if (Number.isFinite(s)) {
            durationMs = Math.max(0, Date.now() - s);
          }
          localStorage.removeItem('pomodoro_start');
        }
        // record session via DataService so dashboard can read it
        try {
          this.data.recordSession(durationMs);
        } catch (e) {
          // fallback to legacy localStorage key if DataService isn't available for some reason
          this.saveSession(durationMs);
        }
        // (Optional) play notification / sound here
      }
    }, 1000);

    // run immediately to avoid waiting 1s
    // call handler once
    // (We can move the above logic into a helper and call once here)
  }

  saveSession(durationMs: number) {
    const sessions = JSON.parse(localStorage.getItem('study_sessions') || '[]');
    sessions.push({
      date: new Date().toISOString(),
      duration: durationMs
    });
    localStorage.setItem('study_sessions', JSON.stringify(sessions));
  }

  reset() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    localStorage.removeItem('pomodoro_end');
    this.timeLeft = 0;
  }

  formatTime(seconds: number) {
    const s = Math.max(0, Math.floor(seconds % 60));
    const m = Math.floor((seconds % 3600) / 60);
    const h = Math.floor(seconds / 3600);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    localStorage.removeItem('pomodoro_end');
    this.timeLeft = 0;
  }
}