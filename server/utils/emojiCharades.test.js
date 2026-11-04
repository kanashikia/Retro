import { describe, it, expect } from 'vitest';
import {
    CANNED_CHARADES,
    normalizeAnswer,
    isCorrectGuess,
    countEmojis,
    sanitizeCharades,
    pointsForRank,
    startEmojiGame,
    recordEmojiGuess,
    advanceEmojiGame,
    getVisibleEmojiState,
} from './emojiCharades.js';

const lion = { emojis: '🦁👑🌅', answer: 'Le Roi Lion', accepted: ['The Lion King'] };
const titanic = { emojis: '🚢🧊💑', answer: 'Titanic', accepted: [] };

describe('normalizeAnswer', () => {
    it('drops case, accents, punctuation and leading articles', () => {
        expect(normalizeAnswer('  Le Roi Lion ! ')).toBe('roi lion');
        expect(normalizeAnswer("L'Été meurtrier")).toBe('ete meurtrier');
        expect(normalizeAnswer('The Lion King')).toBe('lion king');
    });
});

describe('isCorrectGuess', () => {
    it('accepts the answer, accepted variants and small typos', () => {
        expect(isCorrectGuess('roi lion', lion)).toBe(true);
        expect(isCorrectGuess('lion king', lion)).toBe(true);
        expect(isCorrectGuess('Le roi lon', lion)).toBe(true);
        expect(isCorrectGuess('Titanik', titanic)).toBe(true);
    });

    it('rejects other movies, empty guesses and short-word typos', () => {
        expect(isCorrectGuess('Bambi', lion)).toBe(false);
        expect(isCorrectGuess('   ', lion)).toBe(false);
        expect(isCorrectGuess('Upp', { emojis: '🏠🎈👴', answer: 'Up', accepted: [] })).toBe(false);
    });
});

describe('countEmojis / sanitizeCharades', () => {
    it('counts grapheme clusters, including ZWJ sequences', () => {
        expect(countEmojis('🧙‍♂️💍🌋')).toBe(3);
        expect(countEmojis('🦁👑')).toBe(2);
        expect(countEmojis('🦁👑 roi')).toBe(-1);
    });

    it('keeps only charades with exactly 3 emojis and dedupes answers', () => {
        const out = sanitizeCharades([
            lion,
            { emojis: '🦁👑', answer: 'Trop court', accepted: [] },
            { emojis: '🚢🧊💑🌊', answer: 'Trop long', accepted: [] },
            { emojis: '🦁 👑 🌅', answer: 'le roi lion', accepted: 'nope' },
            { emojis: '🤖❤️🌱', answer: '', accepted: [] },
            null,
        ]);
        expect(out).toHaveLength(1);
        expect(out[0].answer).toBe('Le Roi Lion');
    });

    it('accepts every canned charade', () => {
        expect(sanitizeCharades(CANNED_CHARADES)).toHaveLength(CANNED_CHARADES.length);
    });
});

describe('scoring and rounds', () => {
    const ids = ['a', 'b', 'c'];
    const start = () => startEmojiGame({ game: 'emoji', step: 'lobby' }, [lion, titanic], 1000);

    it('gives 10 / 8 / 6 then 5 points by rank, 0 when wrong', () => {
        expect([1, 2, 3, 4, 9].map(pointsForRank)).toEqual([10, 8, 6, 5, 5]);
    });

    it('ranks correct guesses by arrival and refuses a second guess', () => {
        let s = start();
        let r = recordEmojiGuess(s, { participantId: 'a', name: 'Ana', text: 'roi lion', now: 1, participantIds: ids });
        expect(r.result).toEqual({ correct: true, rank: 1, points: 10 });
        s = r.state;
        r = recordEmojiGuess(s, { participantId: 'b', name: 'Bob', text: 'bambi', now: 2, participantIds: ids });
        expect(r.result).toEqual({ correct: false, rank: 0, points: 0 });
        s = r.state;
        r = recordEmojiGuess(s, { participantId: 'c', name: 'Cléo', text: 'lion king', now: 3, participantIds: ids });
        expect(r.result).toEqual({ correct: true, rank: 2, points: 8 });
        s = r.state;
        expect(s.scores).toEqual({ a: 10, b: 0, c: 8 });
        expect(s.step).toBe('reveal');
        expect(recordEmojiGuess(s, { participantId: 'a', name: 'Ana', text: 'again', participantIds: ids }).error).toBeDefined();
    });

    it('does not reveal while someone has not answered', () => {
        const r = recordEmojiGuess(start(), { participantId: 'a', name: 'Ana', text: 'x', participantIds: ids });
        expect(r.state.step).toBe('play');
    });

    it('advances play → reveal → next round → done with a winner', () => {
        let s = start();
        s = recordEmojiGuess(s, { participantId: 'a', name: 'Ana', text: 'roi lion', participantIds: ids }).state;
        s = advanceEmojiGame(s, 5);
        expect(s.step).toBe('reveal');
        s = advanceEmojiGame(s, 6);
        expect(s).toMatchObject({ step: 'play', round: 1, roundStartedAt: 6 });
        s = advanceEmojiGame(s, 7);
        s = advanceEmojiGame(s, 8);
        expect(s).toMatchObject({ step: 'done', winnerId: 'a', winnerName: 'Ana' });
        expect(advanceEmojiGame(s)).toBeNull();
    });
});

describe('getVisibleEmojiState', () => {
    it('hides unrevealed answers and other players guesses during play', () => {
        let s = startEmojiGame({ game: 'emoji' }, [lion, titanic], 0);
        s = recordEmojiGuess(s, { participantId: 'a', name: 'Ana', text: 'roi lion', participantIds: ['a', 'b'] }).state;
        const forB = getVisibleEmojiState(s, 'b');
        expect(forB.charades[0]).toEqual({ emojis: lion.emojis });
        expect(forB.charades[1]).toEqual({ emojis: titanic.emojis });
        expect(forB.submissions['0'].a.text).toBeUndefined();
        expect(forB.submissions['0'].a.correct).toBe(true);
        expect(getVisibleEmojiState(s, 'a').submissions['0'].a.text).toBe('roi lion');
    });

    it('reveals the current answer once the round is over', () => {
        let s = startEmojiGame({ game: 'emoji' }, [lion, titanic], 0);
        s = advanceEmojiGame(s);
        const v = getVisibleEmojiState(s, 'b');
        expect(v.charades[0].answer).toBe('Le Roi Lion');
        expect(v.charades[1].answer).toBeUndefined();
    });

    it('leaves other games untouched', () => {
        const q = { game: 'questions', questions: [] };
        expect(getVisibleEmojiState(q, 'a')).toBe(q);
    });
});
