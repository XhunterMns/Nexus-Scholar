import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent implements OnInit {
  folders: { id: string; name: string; notes: { id: string; title: string; body: string; tags: string[] }[] }[] = [];
  activeFolderId: string | null = null;
  activeNoteId: string | null = null;

  // debounce timer for autosave
  private saveTimer: any = null;
  private SAVE_DEBOUNCE = 700; // ms

  constructor(private data: DataService) {}

  ngOnInit() {
    this.folders = this.data.getNotesFolders();
    if (this.folders.length) this.activeFolderId = this.folders[0].id;
  }

  ngOnDestroy() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  createFolder() {
    const f = this.data.createFolder('New folder');
    this.folders = this.data.getNotesFolders();
    this.activeFolderId = f.id;
  }

  createNote() {
    if (!this.activeFolderId) return;
    const n = this.data.createNote(this.activeFolderId, 'Untitled');
    this.folders = this.data.getNotesFolders();
    if (n) this.activeNoteId = n.id;
  }

  saveNote(body: string) {
    // immediate save (used by blur) — cancel pending debounce and save now
    if (!this.activeFolderId || !this.activeNoteId) return;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.data.updateNote(this.activeFolderId, this.activeNoteId, body);
    this.folders = this.data.getNotesFolders();
  }

  // schedule an autosave (debounced)
  private scheduleSave(body: string) {
    if (!this.activeFolderId || !this.activeNoteId) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.data.updateNote(this.activeFolderId as string, this.activeNoteId as string, body);
      this.folders = this.data.getNotesFolders();
      this.saveTimer = null;
    }, this.SAVE_DEBOUNCE);
  }

  onBodyInput(body: string) {
    // update local model immediately for snappy UI
    const note = this.activeNote;
    if (!note) return;
    note.body = body;
    this.scheduleSave(body);
  }

  onTitleInput(title: string) {
    const note = this.activeNote;
    if (!note || !this.activeFolderId || !this.activeNoteId) return;
    note.title = title;
    // persist title change
    this.data.updateNote(this.activeFolderId, this.activeNoteId, note.body || '', title);
    this.folders = this.data.getNotesFolders();
  }

  removeNote() {
    if (!this.activeFolderId || !this.activeNoteId) return;
    const ok = confirm('Delete this note?');
    if (!ok) return;
    this.data.deleteNote(this.activeFolderId, this.activeNoteId);
    this.folders = this.data.getNotesFolders();
    this.activeNoteId = null;
  }

  selectNote(folderId: string, noteId: string) {
    this.activeFolderId = folderId;
    this.activeNoteId = noteId;
  }

  // convenience getters used by template to simplify bindings
  get activeFolder() {
    return this.folders.find((f) => f.id === this.activeFolderId);
  }

  get activeNote() {
    const f = this.activeFolder;
    if (!f) return undefined;
    return f.notes.find((n) => n.id === this.activeNoteId);
  }
}