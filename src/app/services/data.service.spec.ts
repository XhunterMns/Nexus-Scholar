import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    // instantiate a fresh service for each test to avoid shared state
    service = new DataService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getCards should return the initial cards', () => {
    const cards = service.getCards();
    expect(Array.isArray(cards)).toBeTrue();
    expect(cards.length).toBe(2);
    expect(cards[0].question).toBe('What is Angular?');
  });

  it('markCard should set known flag for an existing card', () => {
    service.markCard(1, true);
    const card = service.getCards().find(c => c.id === 1);
    expect(card).toBeDefined();
    expect(card?.known).toBeTrue();
  });

  it('markCard should do nothing for a non-existing id', () => {
    service.markCard(999, false);
    // still two cards and none should have id 999
    expect(service.getCards().length).toBe(2);
  });
});