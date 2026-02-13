
export enum RetroPhase {
  BRAINSTORM = 'BRAINSTORM',
  GROUPING = 'GROUPING',
  VOTING = 'VOTING',
  DISCUSSION = 'DISCUSSION'
}

export enum ColumnType {
  PUZZLES = 'What puzzles us',
  WELL = 'What went well',
  TRY_NEXT = 'What do we want to try next',
  LESS_WELL = 'What went less well'
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
}

export interface SessionState {
  id: string;
  phase: RetroPhase;
  tickets: Ticket[];
  themes: ThemeGroup[];
  currentThemeIndex: number;
  adminId: string;
  brainstormTimerEndsAt?: number | null;
  brainstormTimerDuration?: number;
}
