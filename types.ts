
export enum RetroPhase {
  BRAINSTORM = 'BRAINSTORM',
  GROUPING = 'GROUPING',
  VOTING = 'VOTING',
  DISCUSSION = 'DISCUSSION'
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
  status?: string;
  phase: RetroPhase;
  tickets: Ticket[];
  themes: ThemeGroup[];
  actions?: Action[];
  currentThemeIndex: number;
  adminId: string;
  brainstormTimerEndsAt?: number | null;
  brainstormTimerDuration?: number;
  defaultThemeId?: string;
}
