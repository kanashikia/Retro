import { describe, it, expect } from 'vitest';
import {
    CANNED_DILEMMAS,
    sanitizeDilemmas,
    startWyrGame,
    recordWyrVote,
    advanceWyrGame,
    getVisibleWyrState,
} from './wouldYouRather.js';

const ids = ['a', 'b', 'c'];
const dilemmas = [{ a: 'Mer', b: 'Montagne' }, { a: 'Thé', b: 'Café' }];
const start = () => startWyrGame({ game: 'wyr', step: 'lobby' }, dilemmas, 1000);

describe('sanitizeDilemmas', () => {
    it('keeps the canned list intact', () => {
        expect(sanitizeDilemmas(CANNED_DILEMMAS)).toHaveLength(CANNED_DILEMMAS.length);
    });

    it('drops unsafe, empty, identical or duplicate options', () => {
        const out = sanitizeDilemmas([
            { a: 'Mer', b: 'Montagne' },
            { a: 'mer ', b: 'MONTAGNE.' },
            { a: 'Caca', b: 'Pipi' },
            { a: 'Mourir de rire', b: 'La mort du cygne' },
            { a: 'Mer', b: 'Mer' },
            { a: '', b: 'x' },
            null,
        ]);
        expect(out).toEqual([{ a: 'Mer', b: 'Montagne' }]);
    });
});

describe('a round', () => {
    it('takes one vote per player, a or b only, and reveals when everyone voted', () => {
        let s = start();
        expect(recordWyrVote(s, { participantId: 'a', name: 'Ana', text: 'c', participantIds: ids }).error).toMatch(/a or b/);
        s = recordWyrVote(s, { participantId: 'a', name: 'Ana', text: 'A', participantIds: ids }).state;
        expect(s.submissions['0'].a.text).toBe('a');
        expect(recordWyrVote(s, { participantId: 'a', name: 'Ana', text: 'b', participantIds: ids }).error).toMatch(/Already/);
        s = recordWyrVote(s, { participantId: 'b', name: 'Bob', text: 'b', participantIds: ids }).state;
        expect(s.step).toBe('play');
        s = recordWyrVote(s, { participantId: 'c', name: 'Cléo', text: 'b', participantIds: ids }).state;
        expect(s.step).toBe('reveal');
    });

    it('moves play → reveal → next → done', () => {
        let s = start();
        s = advanceWyrGame(s, 5);
        expect(s.step).toBe('reveal');
        s = advanceWyrGame(s, 6);
        expect(s).toMatchObject({ step: 'play', round: 1, roundStartedAt: 6 });
        s = advanceWyrGame(s);
        s = advanceWyrGame(s);
        expect(s.step).toBe('done');
        expect(advanceWyrGame(s)).toBeNull();
    });

    it('hides other votes while the vote is open, shows them after', () => {
        let s = start();
        s = recordWyrVote(s, { participantId: 'a', name: 'Ana', text: 'a', participantIds: ids }).state;
        expect(getVisibleWyrState(s, 'b').submissions['0'].a.text).toBeUndefined();
        expect(getVisibleWyrState(s, 'a').submissions['0'].a.text).toBe('a');
        s = advanceWyrGame(s);
        expect(getVisibleWyrState(s, 'b').submissions['0'].a.text).toBe('a');
    });
});
