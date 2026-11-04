import { describe, it, expect } from 'vitest';
import { shuffleSplit, skipQuestion, stripIceBreakerSecrets } from './iceBreaker.js';
import { startEmojiGame, recordEmojiGuess, skipEmojiCharade } from './emojiCharades.js';
import { startJustOneGame, recordJustOneClue, skipJustOneWord } from './justOne.js';
import { startWyrGame, recordWyrVote, skipWyrDilemma } from './wouldYouRather.js';

describe('shuffleSplit', () => {
    it('splits into picked and spare without losing anything', () => {
        const { picked, rest } = shuffleSplit([1, 2, 3, 4, 5], 2, () => 0.5);
        expect(picked).toHaveLength(2);
        expect(rest).toHaveLength(3);
        expect([...picked, ...rest].sort()).toEqual([1, 2, 3, 4, 5]);
    });
});

describe('stripIceBreakerSecrets', () => {
    it('removes every reserve pool before the state reaches a client', () => {
        const out = stripIceBreakerSecrets({ game: 'emoji', charades: [], charadePool: [{}], wordPool: ['x'], dilemmaPool: [{}], spareQuestions: ['q'] });
        expect(out).toEqual({ game: 'emoji', charades: [] });
    });
});

describe('skipQuestion', () => {
    const state = {
        game: 'questions', currentIndex: 1,
        questions: [{ participantId: 'a', participantName: 'Ana', question: 'Q1' }, { participantId: 'b', participantName: 'Bob', question: 'Q2' }],
        spareQuestions: ['S1', 'S2'],
    };
    it('swaps the current question for its spare, once', () => {
        const { state: next } = skipQuestion(state);
        expect(next.questions[1].question).toBe('S2');
        expect(next.questions[0].question).toBe('Q1');
        expect(skipQuestion(next).error).toMatch(/No spare/);
    });
});

describe('skipEmojiCharade', () => {
    const lion = { emojis: '🦁👑🌅', answer: 'Le Roi Lion', accepted: [] };
    const titanic = { emojis: '🚢🧊💑', answer: 'Titanic', accepted: [] };
    const nemo = { emojis: '🐠🔍🌊', answer: 'Le Monde de Nemo', accepted: [] };

    it('replaces the charade, wipes the round and takes back its points', () => {
        let s = startEmojiGame({ game: 'emoji' }, [lion, titanic], 0, [nemo]);
        s = recordEmojiGuess(s, { participantId: 'a', name: 'Ana', text: 'roi lion', participantIds: ['a', 'b'] }).state;
        expect(s.scores.a).toBe(10);
        const { state: next } = skipEmojiCharade(s, 50);
        expect(next.charades[0]).toEqual(nemo);
        expect(next.charades[1]).toEqual(titanic);
        expect(next.charadePool).toEqual([]);
        expect(next.submissions['0']).toBeUndefined();
        expect(next.scores.a).toBe(0);
        expect(next.roundStartedAt).toBe(50);
        expect(skipEmojiCharade(next).error).toMatch(/No spare/);
    });
});

describe('skipJustOneWord', () => {
    it('replaces the word, wipes the clues and goes back to writing', () => {
        let s = startJustOneGame({ game: 'justone' }, ['Pirate', 'Chocolat'], ['a', 'b', 'c'], {}, 0, ['Dragon']);
        s = recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'Capitaine', participantIds: ['a', 'b', 'c'] }).state;
        s = recordJustOneClue(s, { participantId: 'c', name: 'Cléo', text: 'Corsaire', participantIds: ['a', 'b', 'c'] }).state;
        expect(s.step).toBe('play');
        const { state: next } = skipJustOneWord(s, 70);
        expect(next.step).toBe('collect');
        expect(next.words[0]).toEqual({ word: 'Dragon', guesserId: 'a' });
        expect(next.submissions['0']).toBeUndefined();
        expect(next.wordPool).toEqual([]);
        expect(skipJustOneWord(next).error).toMatch(/No spare/);
    });
});

describe('skipWyrDilemma', () => {
    it('replaces the dilemma and wipes the votes', () => {
        let s = startWyrGame({ game: 'wyr' }, [{ a: 'Mer', b: 'Montagne' }], 0, [{ a: 'Thé', b: 'Café' }]);
        s = recordWyrVote(s, { participantId: 'a', name: 'Ana', text: 'a', participantIds: ['a', 'b'] }).state;
        const { state: next } = skipWyrDilemma(s, 9);
        expect(next.dilemmas[0]).toEqual({ a: 'Thé', b: 'Café' });
        expect(next.submissions['0']).toBeUndefined();
        expect(next.roundStartedAt).toBe(9);
        expect(skipWyrDilemma(next).error).toMatch(/No spare/);
    });
});
