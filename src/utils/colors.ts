import { ColumnType } from '../types';

export const getColumnColorClass = (column: ColumnType): string => {
    switch (column) {
        case ColumnType.WELL:
            return 'border-emerald-500';
        case ColumnType.LESS_WELL:
            return 'border-rose-500';
        case ColumnType.PUZZLES:
            return 'border-sky-500';
        case ColumnType.TRY_NEXT:
            return 'border-amber-500';
        default:
            return 'border-slate-200';
    }
};

export const getColumnSurfaceClass = (column: ColumnType): string => {
    switch (column) {
        case ColumnType.WELL:
            return 'bg-emerald-50/80 hover:bg-emerald-50';
        case ColumnType.LESS_WELL:
            return 'bg-rose-50/80 hover:bg-rose-50';
        case ColumnType.PUZZLES:
            return 'bg-sky-50/80 hover:bg-sky-50';
        case ColumnType.TRY_NEXT:
            return 'bg-amber-50/80 hover:bg-amber-50';
        default:
            return 'bg-slate-50 hover:bg-slate-100';
    }
};

export const getColumnSecondaryColorClass = (column: ColumnType): string => {
    switch (column) {
        case ColumnType.WELL:
            return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        case ColumnType.LESS_WELL:
            return 'bg-rose-50 text-rose-700 border-rose-100';
        case ColumnType.PUZZLES:
            return 'bg-sky-50 text-sky-700 border-sky-100';
        case ColumnType.TRY_NEXT:
            return 'bg-amber-50 text-amber-700 border-amber-100';
        default:
            return 'bg-slate-50 text-slate-700 border-slate-100';
    }
};

export const getTicketTextClass = (): string => {
    return 'text-slate-900';
};

export const getTicketMetaTextClass = (): string => {
    return 'text-slate-600';
};

export const getTicketAvatarClass = (): string => {
    return 'bg-white/70 text-slate-700';
};

export const getColumnCompactLabel = (column: ColumnType): string => {
    switch (column) {
        case ColumnType.WELL:
            return 'Well';
        case ColumnType.LESS_WELL:
            return 'Less well';
        case ColumnType.PUZZLES:
            return 'Puzzle';
        case ColumnType.TRY_NEXT:
            return 'Try next';
        default:
            return 'Card';
    }
};
