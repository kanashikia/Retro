import { describe, it, expect } from 'vitest';
import {
    CANNED_FAKEDEFS,
    sanitizeFakeDefs,
    startFakeDefGame,
    recordFakeDef,
    recordFakeDefVote,
    recordFakeDefSubmission,
    advanceFakeDefGame,
    skipFakeDefWord,
    getVisibleFakeDefState,
} from './fakeDefinition.js';

const ids = ['a', 'b', 'c'];
const entries = [{ word: 'Acribie', definition: 'Exactitude minutieuse' }, { word: 'Hapax', definition: 'Mot unique dans un corpus' }];
const fixedRng = () => 0; // keeps the ballot order: real first, then submissions in insertion order
const start = () => startFakeDefGame({ game: 'fakedef', step: 'lobby' }, entries, 1000, [{ word: 'Vétille', definition: 'Chose insignifiante' }]);

describe('sanitizeFakeDefs', () => {
    it('keeps the canned list and drops broken entries', () => {
        expect(sanitizeFakeDefs(CANNED_FAKEDEFS)).toHaveLength(CANNED_FAKEDEFS.length);
        expect(sanitizeFakeDefs([{ word: 'Ok', definition: 'trop court' }, { word: 'Acribie', definition: 'Exactitude minutieuse.' }, { word: 'acribie', definition: 'doublon ignoré ici' }, null]))
            .toEqual([{ word: 'Acribie', definition: 'Exactitude minutieuse' }]);
    });
});

describe('a round', () => {
    it('collects one definition each, then opens an anonymous vote', () => {
        let s = start();
        expect(recordFakeDef(s, { participantId: 'a', name: 'Ana', text: '  ', participantIds: ids }).error).toMatch(/Write/);
        s = recordFakeDef(s, { participantId: 'a', name: 'Ana', text: 'Maladie du coude', participantIds: ids }).state;
        expect(recordFakeDef(s, { participantId: 'a', name: 'Ana', text: 'again', participantIds: ids }).error).toMatch(/already/);
        s = recordFakeDef(s, { participantId: 'b', name: 'Bob', text: 'Danse bretonne', participantIds: ids }).state;
        expect(s.step).toBe('collect');
        s = recordFakeDef(s, { participantId: 'c', name: 'Cléo', text: 'Outil de jardin', participantIds: ids }).state;
        expect(s.step).toBe('play');
        expect(s.ballots['0']).toHaveLength(4);
        expect(s.ballots['0'].map(b => b.key).sort()).toEqual(['a', 'b', 'c', 'real']);
    });

    it('scores fooling and spotting, refuses own votes, reveals when everyone voted', () => {
        let s = start();
        s = recordFakeDef(s, { participantId: 'a', name: 'Ana', text: 'Maladie du coude', participantIds: ids }).state;
        s = recordFakeDef(s, { participantId: 'b', name: 'Bob', text: 'Danse bretonne', participantIds: ids }).state;
        s = advanceFakeDefGame(s, 5, fixedRng); // close early without Cléo
        expect(s.step).toBe('play');
        const idx = (key) => s.ballots['0'].findIndex(b => b.key === key);
        expect(recordFakeDefVote(s, { participantId: 'a', text: String(idx('a')), participantIds: ids }).error).toMatch(/own/);
        expect(recordFakeDefVote(s, { participantId: 'a', text: '9', participantIds: ids }).error).toMatch(/Pick/);
        s = recordFakeDefVote(s, { participantId: 'a', text: String(idx('real')), participantIds: ids }).state;   // Ana spots the truth
        s = recordFakeDefVote(s, { participantId: 'b', text: String(idx('a')), participantIds: ids }).state;      // Bob fooled by Ana
        expect(s.step).toBe('play');
        s = recordFakeDefSubmission(s, { participantId: 'c', text: String(idx('a')), participantIds: ids }).state; // Cléo fooled by Ana
        expect(s.step).toBe('reveal');
        expect(s.scores).toEqual({ a: 1 + 2 + 2 });
    });

    it('moves to the next word, then ends with the best liar', () => {
        let s = start();
        s = advanceFakeDefGame(s, 1, fixedRng);
        s = advanceFakeDefGame(s, 2);
        expect(s.step).toBe('reveal');
        s = advanceFakeDefGame(s, 3);
        expect(s).toMatchObject({ step: 'collect', round: 1, roundStartedAt: 3 });
        s = recordFakeDef(s, { participantId: 'b', name: 'Bob', text: 'Un truc', participantIds: ids }).state;
        s = advanceFakeDefGame(s, 4, fixedRng);
        const bobIdx = s.ballots['1'].findIndex(b => b.key === 'b');
        s = recordFakeDefVote(s, { participantId: 'a', text: String(bobIdx), participantIds: ids }).state;
        s = advanceFakeDefGame(s, 5);
        s = advanceFakeDefGame(s, 6);
        expect(s).toMatchObject({ step: 'done', winnerId: 'b', winnerName: 'Bob' });
        expect(advanceFakeDefGame(s)).toBeNull();
    });

    it('skips the word and wipes the round', () => {
        let s = start();
        s = recordFakeDef(s, { participantId: 'a', name: 'Ana', text: 'Maladie du coude', participantIds: ids }).state;
        const { state: next } = skipFakeDefWord(s, 9);
        expect(next.words[0]).toEqual({ word: 'Vétille', definition: 'Chose insignifiante' });
        expect(next.submissions['0']).toBeUndefined();
        expect(next.step).toBe('collect');
        expect(skipFakeDefWord(next).error).toMatch(/No spare/);
    });
});

describe('getVisibleFakeDefState', () => {
    it('hides the real definition, other fakes while writing, ballot owners while voting', () => {
        let s = start();
        s = recordFakeDef(s, { participantId: 'a', name: 'Ana', text: 'Maladie du coude', participantIds: ids }).state;
        let v = getVisibleFakeDefState(s, 'b');
        expect(v.words[0]).toEqual({ word: 'Acribie' });
        expect(v.words[1]).toEqual({ word: undefined });
        expect(v.submissions['0'].a.text).toBeUndefined();
        expect(getVisibleFakeDefState(s, 'a').submissions['0'].a.text).toBe('Maladie du coude');

        s = advanceFakeDefGame(s, 2, fixedRng);
        v = getVisibleFakeDefState(s, 'b');
        expect(v.ballots['0'].every(b => b.key === undefined && typeof b.text === 'string')).toBe(true);
        expect(v.words[0].definition).toBeUndefined();

        s = advanceFakeDefGame(s, 3);
        v = getVisibleFakeDefState(s, 'b');
        expect(v.words[0].definition).toBe('Exactitude minutieuse');
        expect(v.ballots['0'].some(b => b.key === 'real')).toBe(true);
    });
});
