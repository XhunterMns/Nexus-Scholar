import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { NotesComponent } from './components/notes/notes.component';
import { FlashcardsComponent } from './components/flashcards/flashcards.component';
import { PomodoroComponent } from './components/pomodoro/pomodoro.component';

export const routes: Routes = [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'flashcards', component: FlashcardsComponent },
    { path: 'pomodoro', component: PomodoroComponent },
    { path: 'notes', component: NotesComponent },
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];
