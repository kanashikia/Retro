import { describe, it, expect } from 'vitest';
import { getColumnColorClass, getColumnSecondaryColorClass } from './colors';
import { ColumnType } from '../types';

describe('colors utility', () => {
    describe('getColumnColorClass', () => {
        it('should return correct class for WELL column', () => {
            expect(getColumnColorClass(ColumnType.WELL)).toBe('border-emerald-500');
        });

        it('should return correct class for LESS_WELL column', () => {
            expect(getColumnColorClass(ColumnType.LESS_WELL)).toBe('border-rose-500');
        });

        it('should return correct class for PUZZLES column', () => {
            expect(getColumnColorClass(ColumnType.PUZZLES)).toBe('border-sky-500');
        });

        it('should return correct class for TRY_NEXT column', () => {
            expect(getColumnColorClass(ColumnType.TRY_NEXT)).toBe('border-amber-500');
        });

        it('should return default class for invalid column', () => {
            expect(getColumnColorClass('INVALID' as any)).toBe('border-slate-200');
        });
    });

    describe('getColumnSecondaryColorClass', () => {
        it('should return correct secondary class for WELL column', () => {
            expect(getColumnSecondaryColorClass(ColumnType.WELL)).toContain('bg-emerald-50');
            expect(getColumnSecondaryColorClass(ColumnType.WELL)).toContain('text-emerald-700');
        });

        it('should return default secondary class for invalid column', () => {
            expect(getColumnSecondaryColorClass('INVALID' as any)).toContain('bg-slate-50');
        });
    });
});
