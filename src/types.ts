
export enum RetroPhase {
  ICE_BREAKER = 'ICE_BREAKER',
  BRAINSTORM = 'BRAINSTORM',
  GROUPING = 'GROUPING',
  VOTING = 'VOTING',
  DISCUSSION = 'DISCUSSION'
}

export interface IceBreakerQuestion {
  participantId: string;
  participantName: string;
  question: string;
}

export type IceBreakerGameId = 'questions' | 'emoji' | 'justone' | 'wyr' | 'fakedef';

export type IceBreakerStep = 'select' | 'lobby' | 'collect' | 'play' | 'reveal' | 'done';

export interface EmojiCharade {
  emojis: string;
  /** Only present once the round is revealed (the server strips it before). */
  answer?: string;
  accepted?: string[];
}

export interface IceBreakerSubmission {
  /** Other players' entries are hidden while the round is open. */
  text?: string;
  // emoji charades: a guess
  correct?: boolean;
  rank?: number;
  points?: number;
  // just one: a clue, resolved when the guess step opens
  kept?: boolean;
  reason?: 'duplicate' | 'word';
  at: number;
}

export interface JustOneRound {
  /** Hidden from the guesser until the reveal, and from everyone for future rounds. */
  word?: string;
  guesserId?: string;
  /** Fake Definition: the real definition, revealed with the round. */
  definition?: string;
}

/** Fake Definition: one anonymous candidate; `key` ('real' or a participant id) appears at the reveal. */
export interface FakeDefBallot {
  key?: string;
  text: string;
}

export interface IceBreakerState {
  /** null = the admin has not picked a game yet. Absent on legacy sessions. */
  game?: IceBreakerGameId | null;
  step?: IceBreakerStep;
  round?: number;
  /** Set when the game came from the random wheel; clients animate once per id. */
  spin?: { id: string; at: number };
  /** Games the admin switched out of the random wheel. */
  excludedGames?: IceBreakerGameId[];
  // "questions" game
  questions: IceBreakerQuestion[];
  currentIndex: number;
  // "emoji" game
  charades?: EmojiCharade[];
  // "wyr" game: votes are submissions with text 'a' | 'b'
  dilemmas?: { a: string; b: string }[];
  // "justone" and "fakedef" games
  words?: JustOneRound[];
  // "fakedef" game
  ballots?: Record<string, FakeDefBallot[]>;
  votes?: Record<string, Record<string, { index?: number; at: number }>>;
  guesses?: Record<string, { text: string; correct: boolean; at: number }>;
  teamScore?: number;
  /** Start of the current step, for the client-side countdown. */
  roundStartedAt?: number;
  // generic game data, keyed by round then participant id
  submissions?: Record<string, Record<string, IceBreakerSubmission>>;
  scores?: Record<string, number>;
  /** participant id → display name, kept so scores survive disconnects */
  players?: Record<string, string>;
  winnerId?: string;
  winnerName?: string;
}

export enum ColumnType {
  WELL = 'What went well',
  LESS_WELL = 'What went less well',
  TRY_NEXT = 'What do we want to try next',
  PUZZLES = 'What puzzles us'
}

export interface Ticket {
  id: string;
  text: string;
  column: ColumnType;
  author: string;
  authorId?: string;
  votes: number;
  voterIds: string[];
  themeId?: string;
  reactions?: Record<string, string[]>; // emoji -> userIds
}

export interface ThemeGroup {
  id: string;
  name: string;
  description: string;
  votes: number;
  voterIds: string[];
}

export interface User {
  id: string;
  name: string;
  isAdmin: boolean;
  votesRemaining: number;
  isReady?: boolean;
}

export interface Action {
  id: string;
  text: string;
  assigneeId: string;
  assigneeName: string;
}

export interface SessionState {
  id: string;
  name?: string | null;
  status?: string;
  phase: RetroPhase;
  tickets: Ticket[];
  themes: ThemeGroup[];
  actions?: Action[];
  currentThemeIndex: number;
  adminId: string;
  createdAt?: string;
  brainstormTimerEndsAt?: number | null;
  brainstormTimerDuration?: number;
  defaultThemeId?: string;
  hasIceBreaker?: boolean;
  iceBreakerState?: IceBreakerState;
}
