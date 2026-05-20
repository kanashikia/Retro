import { describe, expect, it } from 'vitest';
import { ColumnType } from '../types';
import {
    getColumnSecondaryColorClass,
    getTicketAvatarClass,
    getTicketMetaTextClass,
    getTicketTextClass,
} from './colors';

describe('ticket contrast helpers', () => {
    it('uses explicit readable text colors inside colored tickets', () => {
        expect(getTicketTextClass()).toBe('text-slate-900');
        expect(getTicketMetaTextClass()).toBe('text-slate-600');
        expect(getTicketAvatarClass()).toBe('bg-white/70 text-slate-700');
    });

    it('keeps column badges on their dedicated accessible palette', () => {
        expect(getColumnSecondaryColorClass(ColumnType.WELL)).toContain('text-emerald-700');
        expect(getColumnSecondaryColorClass(ColumnType.LESS_WELL)).toContain('text-rose-700');
        expect(getColumnSecondaryColorClass(ColumnType.PUZZLES)).toContain('text-sky-700');
        expect(getColumnSecondaryColorClass(ColumnType.TRY_NEXT)).toContain('text-amber-700');
    });
});
