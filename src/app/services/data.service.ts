import { Injectable } from '@angular/core';

type Card = { id: number; question: string; answer: string; known: boolean | null };
type Deck = { id: string; title: string; description?: string; cardCount: number };

type Note = { id: string; title: string; body: string; tags: string[] };

type Folder = { id: string; name: string; notes: Note[] };

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly CARDS_KEY = 'study.cards.v1';
  private readonly SESSIONS_KEY = 'study.sessions.v1';
  private readonly NOTES_KEY = 'study.notes.v1';
  private readonly DECKS_KEY = 'study.decks.v1';

  cards: Card[] = [];
  decks: Deck[] = [];

  constructor() {
    // guard localStorage access for server-side rendering
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        this.loadCards();
        this.loadDecks();
      } else {
        // fallback to empty sets in non-browser environments
        this.cards = [];
        this.decks = [];
      }
    } catch (e) {
      this.cards = [];
      this.decks = [];
    }
  }

  private loadDecks() {
    try {
      const raw = localStorage.getItem(this.DECKS_KEY);
      if (raw) this.decks = JSON.parse(raw);
      else {
        this.decks = [];
        this.saveDecks();
      }
    } catch (e) {
      this.decks = [];
    }
  }

  private saveDecks() {
    localStorage.setItem(this.DECKS_KEY, JSON.stringify(this.decks));
  }

  getDecks(): Deck[] {
    return this.decks;
  }

  createDeck(title: string, description?: string) {
    const d: Deck = { id: String(Date.now()) + Math.random().toString(36).slice(2,8), title, description, cardCount: 0 };
    this.decks.push(d);
    this.saveDecks();
    return d;
  }

  incrementDeckCount(deckId: string, delta = 1) {
    const d = this.decks.find(x => x.id === deckId);
    if (!d) return;
    d.cardCount = Math.max(0, (d.cardCount || 0) + delta);
    this.saveDecks();
  }

  private loadCards() {
    try {
      const raw = localStorage.getItem(this.CARDS_KEY);
      if (raw) this.cards = JSON.parse(raw);
      else {
        this.cards = [
          { id: 1, question: 'What is Angular?', answer: 'A frontend framework', known: null },
          { id: 2, question: 'What is TypeScript?', answer: 'Typed JavaScript', known: null }
        ];
        this.saveCards();
      }
    } catch (e) {
      this.cards = [];
    }
  }

  private saveCards() {
    localStorage.setItem(this.CARDS_KEY, JSON.stringify(this.cards));
  }

  getCards(): Card[] {
    return this.cards;
  }

  markCard(id: number, known: boolean) {
    const card = this.cards.find(c => c.id === id);
    if (card) {
      card.known = known;
      this.saveCards();
    }
  }

  // sessions are simple records of { ts, durationMs }
  recordSession(durationMs: number) {
    try {
      const raw = localStorage.getItem(this.SESSIONS_KEY);
      const sessions = raw ? JSON.parse(raw) : [];
      sessions.push({ ts: Date.now(), durationMs });
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      // ignore
    }
  }

  getSessions(): { ts: number; durationMs: number }[] {
    try {
      const raw = localStorage.getItem(this.SESSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  // notes / folders
  getNotesFolders(): Folder[] {
    try {
      const raw = localStorage.getItem(this.NOTES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  createFolder(name: string): Folder {
    const f: Folder = { id: String(Date.now()), name, notes: [] };
    const folders = this.getNotesFolders();
    folders.push(f);
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(folders));
    return f;
  }

  createNote(folderId: string, title: string): Note | null {
    const folders = this.getNotesFolders();
    const f = folders.find(x => x.id === folderId);
    if (!f) return null;
    const n: Note = { id: String(Date.now()), title, body: '', tags: [] };
    f.notes.push(n);
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(folders));
    return n;
  }

  // update note body and optionally its title
  updateNote(folderId: string, noteId: string, body: string, title?: string) {
    const folders = this.getNotesFolders();
    const f = folders.find(x => x.id === folderId);
    if (!f) return;
    const n = f.notes.find(x => x.id === noteId);
    if (!n) return;
    n.body = body;
    if (title !== undefined) n.title = title;
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(folders));
  }

  // remove a note from a folder
  deleteNote(folderId: string, noteId: string) {
    const folders = this.getNotesFolders();
    const f = folders.find(x => x.id === folderId);
    if (!f) return;
    f.notes = f.notes.filter((x) => x.id !== noteId);
    localStorage.setItem(this.NOTES_KEY, JSON.stringify(folders));
  }
}
