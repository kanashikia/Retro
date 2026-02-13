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
