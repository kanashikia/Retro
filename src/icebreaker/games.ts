import { IceBreakerGameId, IceBreakerState } from '../types';

// Client game registry. Keep ids and availability in sync with
// server/utils/iceBreaker.js — the server is the one that validates picks.
export interface IceBreakerGameMeta {
  id: IceBreakerGameId;
  name: string;
  emoji: string;
  tagline: string;
  /** Accent color used on the wheel segment, the pick card and the game header. */
  color: string;
  available: boolean;
  /** Shows a "New" sticker on the pick card. */
  isNew?: boolean;
}

export const ICE_BREAKER_GAMES: IceBreakerGameMeta[] = [
  {
    id: 'questions',
    name: 'Question Roulette',
    emoji: '🎰',
    tagline: 'The wheel picks a name, Gemini picks the question.',
    color: '#6366f1',
    available: true,
  },
  {
    id: 'emoji',
    name: 'Emoji Charades',
    emoji: '🎬',
    tagline: 'Three emojis, one movie. Fastest guess wins.',
    color: '#f59e0b',
    available: true,
    isNew: true,
  },
  {
    id: 'justone',
    name: 'Just One',
    emoji: '💡',
    tagline: 'One secret word, one clue each. Duplicates burn.',
    color: '#10b981',
    available: true,
    isNew: true,
  },
  {
    id: 'wyr',
    name: 'Would You Rather',
    emoji: '🤔',
    tagline: 'Two options, one pick. Where does the team stand?',
    color: '#ec4899',
    available: true,
    isNew: true,
  },
  {
    id: 'fakedef',
    name: 'Fake Definition',
    emoji: '📖',
    tagline: 'Invent a definition, spot the real one.',
    color: '#0ea5e9',
    available: true,
    isNew: true,
  },
  {
    id: 'airhockey',
    name: 'Air Hockey',
    emoji: '🏒',
    tagline: 'Everyone at once, two teams, live. Ice, sea, then desert.',
    color: '#06b6d4',
    available: true,
    isNew: true,
  },
];

export const RANDOM_GAME = 'random' as const;
export type GamePick = IceBreakerGameId | typeof RANDOM_GAME;

/** How long after the server stamped a spin a freshly loaded client still plays the wheel. */
export const SPIN_REPLAY_WINDOW_MS = 8000;

export const getGameMeta = (id: IceBreakerGameId | null | undefined): IceBreakerGameMeta | undefined =>
  ICE_BREAKER_GAMES.find(g => g.id === id);

export const availableGames = (): IceBreakerGameMeta[] => ICE_BREAKER_GAMES.filter(g => g.available);

/** Games the random wheel can land on: playable ones minus what the admin switched off. */
export const wheelGames = (excluded: IceBreakerGameId[] = []): IceBreakerGameMeta[] =>
  availableGames().filter(g => !excluded.includes(g.id));

/** Legacy sessions had no `game` field: questions present means the questions game. */
export const resolveGame = (state: IceBreakerState | undefined | null): IceBreakerGameId | null => {
  if (!state) return null;
  if (state.game && getGameMeta(state.game)) return state.game;
  if (state.game === undefined && (state.questions?.length ?? 0) > 0) return 'questions';
  return null;
};
