import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Deck {
  id: number;
  title: string;
  description: string;
  cardCount: number;
}

interface Card {
  id: number;
  deckId: number;
  question: string;
  answer: string;
}

@Component({
  selector: 'app-flash-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flashcards.component.html',
  styleUrls: ['./flashcards.component.css']
})
export class FlashcardsComponent {
ngOnInit() {
  this.decks = [
    {
      id: 1,
      title: 'Test Deck',
      description: 'Demo deck',
      cardCount: 2
    }
  ];

  this.cards = [
    {
      id: 1,
      deckId: 1,
      question: 'What is Angular?',
      answer: 'Frontend framework'
    },
    {
      id: 2,
      deckId: 1,
      question: 'What is TypeScript?',
      answer: 'Typed JS'
    }
  ];
}
  // ------------------------
  // STATE
  // ------------------------
  decks: Deck[] = [];
  cards: Card[] = [];

  selectedDeckId: number | null = null;
  studyMode = false;

  showCreateDeck = false;
  showCreateCard = false;

  newDeck = {
    title: '',
    description: ''
  };

  newCard = {
    question: '',
    answer: ''
  };

  // file upload / generation state
  selectedFile?: File;
  generatedText = '';

  currentCardIdx = 0;
  showAnswer = false;

  // ------------------------
  // GETTERS
  // ------------------------
  get selectedDeck(): Deck | undefined {
    return this.decks.find(d => d.id === this.selectedDeckId);
  }

  get deckCards(): Card[] {
    return this.cards.filter(c => c.deckId === this.selectedDeckId);
  }

  // safe current card accessor to avoid optional chaining in templates
  get currentCard() {
    return this.deckCards[this.currentCardIdx] ?? { question: '', answer: '' } as Partial<Card>;
  }

  // ------------------------
  // DECK METHODS
  // ------------------------
  createDeck() {
    if (!this.newDeck.title.trim()) return;

    const newDeck: Deck = {
      id: Date.now(),
      title: this.newDeck.title,
      description: this.newDeck.description,
      cardCount: 0
    };

    this.decks.push(newDeck);

    this.newDeck = { title: '', description: '' };
    this.showCreateDeck = false;
  }

  selectDeck(id: number | null) {
    this.selectedDeckId = id;
    this.studyMode = false;
    this.currentCardIdx = 0;
    this.showAnswer = false;
  }

  // ------------------------
  // CARD METHODS
  // ------------------------
  createCard() {
    if (!this.newCard.question.trim() || !this.newCard.answer.trim()) return;
    if (!this.selectedDeckId) return;

    const card: Card = {
      id: Date.now(),
      deckId: this.selectedDeckId,
      question: this.newCard.question,
      answer: this.newCard.answer
    };

    this.cards.push(card);

    // update deck count
    const deck = this.decks.find(d => d.id === this.selectedDeckId);
    if (deck) deck.cardCount++;

    this.newCard = { question: '', answer: '' };
    this.showCreateCard = false;
  }

  // add card programmatically (used by parser/upload)
  private addCardToDeck(question: string, answer: string) {
    if (!this.selectedDeckId) return;
    const card: Card = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      deckId: this.selectedDeckId,
      question: question.trim(),
      answer: answer.trim()
    };
    this.cards.push(card);
    const deck = this.decks.find(d => d.id === this.selectedDeckId);
    if (deck) deck.cardCount++;
  }

  // ------------------------
  // FILE UPLOAD / PARSING
  // ------------------------
  onFileSelected(event: any) {
    const f = event?.target?.files && event.target.files[0];
    if (f) this.selectedFile = f;
  }

  async upload() {
    if (!this.selectedFile) return alert('Please choose a file first');
    if (!this.selectedDeckId) return alert('Please select a deck to add the generated cards to.');
    try {
  // Read file text and POST JSON to a same-origin endpoint to avoid multipart parsing on the server
  const text = await this.selectedFile.text();
  const payload = { filename: this.selectedFile.name, text };
      const res = await fetch('/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Upload failed: ${res.status} ${errText}`);
      }

      // server may return JSON { output } or plain text; handle both
      const bodyText = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        parsed = null;
      }
      this.generatedText = (parsed && (parsed.output || parsed.text)) || bodyText || '';
      this.parseCards(this.generatedText);
    } catch (err: any) {
      console.error(err);
      alert('Upload failed. See console for details.');
    }
  }

  // Naive parser: supports Q: / A: pairs or blocks separated by blank lines
  parseCards(text: string) {
    if (!text) return;
    const cards: { q: string; a: string }[] = [];

    // Try Q:/A: pairs first
    const lines = text.split(/\r?\n/);
    let currentQ = '';
    let currentA = '';
    let mode: 'q' | 'a' | null = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) {
        if (currentQ || currentA) {
          cards.push({ q: currentQ, a: currentA });
          currentQ = '';
          currentA = '';
          mode = null;
        }
        continue;
      }
      const qMatch = line.match(/^Q[:\-\s]+(.*)$/i);
      const aMatch = line.match(/^A[:\-\s]+(.*)$/i);
      if (qMatch) { currentQ = qMatch[1].trim(); mode = 'q'; continue; }
      if (aMatch) { currentA = aMatch[1].trim(); mode = 'a'; continue; }
      if (mode === 'q') currentQ += (currentQ ? ' ' : '') + line;
      else if (mode === 'a') currentA += (currentA ? ' ' : '') + line;
      else {
        // fallback: if no explicit Q/A, use first line as Q, rest as A in a block
        if (!currentQ) currentQ = line;
        else currentA += (currentA ? ' ' : '') + line;
      }
    }
    if (currentQ || currentA) cards.push({ q: currentQ, a: currentA });

    // If no cards found via Q/A, try splitting by double newlines into blocks
    if (cards.length === 0) {
      const blocks = text.split(/\n\s*\n+/);
      for (const b of blocks) {
        const lines = b.trim().split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) continue;
        const q = lines[0];
        const a = lines.slice(1).join(' ') || '—';
        cards.push({ q, a });
      }
    }

    // add parsed cards to the selected deck
    const added = [] as { q: string; a: string }[];
    for (const c of cards) {
      if (!c.q && !c.a) continue;
      this.addCardToDeck(c.q || 'Question', c.a || 'Answer');
      added.push(c);
    }
    if (added.length) {
      alert(`Added ${added.length} cards to deck.`);
    } else {
      alert('No cards were detected in the uploaded file.');
    }
  }

  // ------------------------
  // STUDY MODE
  // ------------------------
  startStudy() {
    if (!this.selectedDeckId || this.deckCards.length === 0) return;

    this.studyMode = true;
    this.currentCardIdx = 0;
    this.showAnswer = false;
  }

  toggleShowAnswer() {
    this.showAnswer = !this.showAnswer;
  }

  rateAndNext(rating: 'Again' | 'Hard' | 'Good' | 'Easy') {
    // (later: use this for spaced repetition)

    this.showAnswer = false;

    if (this.currentCardIdx < this.deckCards.length - 1) {
      this.currentCardIdx++;
    } else {
      // end of deck
      this.studyMode = false;
      this.currentCardIdx = 0;
    }
  }

}