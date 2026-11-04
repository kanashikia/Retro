import { describe, it, expect } from 'vitest';
import {
    CANNED_WORDS,
    sanitizeWords,
    stemClue,
    isSingleWord,
    buildRounds,
    startJustOneGame,
    recordJustOneClue,
    recordJustOneGuess,
    recordJustOneSubmission,
    advanceJustOneGame,
    getVisibleJustOneState,
} from './justOne.js';

const ids = ['a', 'b', 'c'];
const names = { a: 'Ana', b: 'Bob', c: 'Cléo' };
const start = () => startJustOneGame({ game: 'justone', step: 'lobby' }, ['Pirate', 'Chocolat'], ids, names, 1000);

describe('words and clues', () => {
    it('sanitizes and dedupes words, and accepts every canned word', () => {
        expect(sanitizeWords(['Pirate', ' pirate ', 'Tour Eiffel', 'x', 'bad!!', null])).toEqual(['Pirate', 'Tour Eiffel']);
        expect(sanitizeWords(CANNED_WORDS)).toHaveLength(CANNED_WORDS.length);
    });

    it('stems plurals and feminine endings', () => {
        expect(stemClue('Rois')).toBe(stemClue('roi'));
        expect(stemClue('Chatte')).toBe(stemClue('chat'));
        expect(stemClue('Bateaux')).toBe(stemClue('bateau'));
        expect(stemClue('Épée')).not.toBe(stemClue('pirate'));
    });

    it('accepts one word, with hyphen or apostrophe, nothing more', () => {
        expect(isSingleWord('Capitaine')).toBe(true);
        expect(isSingleWord('Super-héros')).toBe(true);
        expect(isSingleWord("L'île")).toBe(true);
        expect(isSingleWord('deux mots')).toBe(false);
    });

    it('plays every word up to the cap, rotating guessers even with few players', () => {
        expect(buildRounds(['w1', 'w2', 'w3', 'w4'], ['a', 'b'])).toEqual([
            { word: 'w1', guesserId: 'a' }, { word: 'w2', guesserId: 'b' },
            { word: 'w3', guesserId: 'a' }, { word: 'w4', guesserId: 'b' },
        ]);
        expect(buildRounds(['w1', 'w2', 'w3', 'w4', 'w5', 'w6'], ['a', 'b', 'c'])).toHaveLength(5);
        expect(buildRounds(['w1'], [])).toEqual([]);
    });
});

describe('a full round', () => {
    it('collects clues, burns duplicates and word giveaways, then scores the guess', () => {
        let s = start();
        expect(s.step).toBe('collect');
        expect(s.words[0].guesserId).toBe('a');

        expect(recordJustOneClue(s, { participantId: 'a', name: 'Ana', text: 'bateau', participantIds: ids }).error).toMatch(/guesser/);
        expect(recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'deux mots', participantIds: ids }).error).toMatch(/One word/);

        s = recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'Bateau', now: 1, participantIds: ids }).state;
        expect(s.step).toBe('collect');
        expect(recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'again', participantIds: ids }).error).toMatch(/already/);

        s = recordJustOneClue(s, { participantId: 'c', name: 'Cléo', text: 'bateaux', now: 2, participantIds: ids }).state;
        expect(s.step).toBe('play');
        expect(s.submissions['0'].b).toMatchObject({ kept: false, reason: 'duplicate' });
        expect(s.submissions['0'].c).toMatchObject({ kept: false, reason: 'duplicate' });

        expect(recordJustOneGuess(s, { participantId: 'b', text: 'pirate' }).error).toMatch(/Only the guesser/);
        s = recordJustOneGuess(s, { participantId: 'a', name: 'Ana', text: 'Pirates', now: 3 }).state;
        expect(s.step).toBe('reveal');
        expect(s.guesses['0']).toMatchObject({ text: 'Pirates', correct: true });
        expect(s.teamScore).toBe(1);
        expect(s.scores).toEqual({ a: 1 });
    });

    it('rewards clue writers whose clue survived', () => {
        let s = start();
        s = recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'Capitaine', participantIds: ids }).state;
        s = recordJustOneClue(s, { participantId: 'c', name: 'Cléo', text: 'Piraterie', participantIds: ids }).state;
        expect(s.submissions['0'].b.kept).toBe(true);
        expect(s.submissions['0'].c).toMatchObject({ kept: false, reason: 'word' });
        s = recordJustOneSubmission(s, { participantId: 'a', name: 'Ana', text: 'pirate' }).state;
        expect(s.scores).toEqual({ a: 1, b: 1 });
    });

    it('scores nothing on a pass or a wrong guess', () => {
        let s = start();
        s = advanceJustOneGame(s, 5);
        expect(s.step).toBe('play');
        s = advanceJustOneGame(s, 6);
        expect(s.step).toBe('reveal');
        expect(s.guesses['0']).toMatchObject({ text: '', correct: false });
        expect(s.teamScore).toBe(0);
    });

    it('moves to the next guesser, then ends with an MVP', () => {
        let s = start();
        s = recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'Capitaine', participantIds: ids }).state;
        s = recordJustOneClue(s, { participantId: 'c', name: 'Cléo', text: 'Corsaire', participantIds: ids }).state;
        s = recordJustOneGuess(s, { participantId: 'a', name: 'Ana', text: 'pirate' }).state;
        s = advanceJustOneGame(s, 10);
        expect(s).toMatchObject({ step: 'collect', round: 1, roundStartedAt: 10 });
        expect(s.words[1].guesserId).toBe('b');
        s = advanceJustOneGame(s); // close clues (none)
        s = advanceJustOneGame(s); // pass
        s = advanceJustOneGame(s);
        expect(s.step).toBe('done');
        expect(s.winnerId).toBe('a');
        expect(s.teamScore).toBe(1);
        expect(advanceJustOneGame(s)).toBeNull();
    });
});

describe('getVisibleJustOneState', () => {
    it('hides the word from the guesser and future words from everyone', () => {
        const s = start();
        expect(getVisibleJustOneState(s, 'a').words[0].word).toBeUndefined();
        expect(getVisibleJustOneState(s, 'b').words[0].word).toBe('Pirate');
        expect(getVisibleJustOneState(s, 'b').words[1].word).toBeUndefined();
    });

    it('hides other clues while writing, and burned clues from the guesser while guessing', () => {
        let s = start();
        s = recordJustOneClue(s, { participantId: 'b', name: 'Bob', text: 'Capitaine', participantIds: ids }).state;
        expect(getVisibleJustOneState(s, 'c').submissions['0'].b.text).toBeUndefined();
        expect(getVisibleJustOneState(s, 'b').submissions['0'].b.text).toBe('Capitaine');

        s = recordJustOneClue(s, { participantId: 'c', name: 'Cléo', text: 'Piraterie', participantIds: ids }).state;
        const guesserView = getVisibleJustOneState(s, 'a');
        expect(guesserView.submissions['0'].b.text).toBe('Capitaine');
        expect(guesserView.submissions['0'].c.text).toBeUndefined();
        expect(getVisibleJustOneState(s, 'b').submissions['0'].c.text).toBe('Piraterie');
    });

    it('reveals everything after the guess', () => {
        let s = start();
        s = advanceJustOneGame(s);
        s = advanceJustOneGame(s);
        expect(getVisibleJustOneState(s, 'a').words[0].word).toBe('Pirate');
    });
});
