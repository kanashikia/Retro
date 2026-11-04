import { describe, it, expect } from 'vitest';
import {
    AVAILABLE_ICE_BREAKER_GAMES,
    normalizeIceBreakerState,
    buildSelectedGameState,
    buildResetGameState,
    pickRandomGame,
    setExcludedGames,
    topUpPool,
} from './iceBreaker.js';

describe('normalizeIceBreakerState', () => {
    it('treats a legacy state with questions as the questions game', () => {
        const state = normalizeIceBreakerState({
            questions: [{ participantId: 'u1', participantName: 'Ana', question: 'Q?' }],
            currentIndex: 0,
        });
        expect(state.game).toBe('questions');
        expect(state.step).toBe('play');
        expect(state.scores).toEqual({});
    });

    it('returns the selection screen for an empty state', () => {
        const state = normalizeIceBreakerState(undefined);
        expect(state.game).toBeNull();
        expect(state.step).toBe('select');
        expect(state.questions).toEqual([]);
    });

    it('drops unknown game ids', () => {
        expect(normalizeIceBreakerState({ game: 'hack' }).game).toBeNull();
    });
});

describe('buildSelectedGameState', () => {
    it('selects an available game and clears previous progress', () => {
        const prev = { game: 'questions', questions: [{ participantId: 'u1', participantName: 'A', question: 'Q' }], currentIndex: 1, scores: { u1: 3 } };
        const state = buildSelectedGameState(prev, 'questions', { now: 1000 });
        expect(state.game).toBe('questions');
        expect(state.step).toBe('lobby');
        expect(state.questions).toEqual([]);
        expect(state.scores).toEqual({});
        expect(state.spin).toBeUndefined();
    });

    it('rejects unavailable or unknown games', () => {
        expect(buildSelectedGameState({}, 'nope')).toBeNull();
    });

    it('draws a game server-side on random and stamps a spin', () => {
        const state = buildSelectedGameState({}, 'random', { rng: () => 0, now: 42, spinId: 'spin-1' });
        expect(AVAILABLE_ICE_BREAKER_GAMES).toContain(state.game);
        expect(state.spin).toEqual({ id: 'spin-1', at: 42 });
    });
});

describe('pickRandomGame', () => {
    it('never goes out of bounds', () => {
        expect(AVAILABLE_ICE_BREAKER_GAMES).toContain(pickRandomGame(() => 0.999999));
        expect(AVAILABLE_ICE_BREAKER_GAMES).toContain(pickRandomGame(() => 0));
    });

    it('skips the games switched off, and gives up when none is left', () => {
        const allButOne = AVAILABLE_ICE_BREAKER_GAMES.slice(1);
        expect(pickRandomGame(() => 0.7, allButOne)).toBe(AVAILABLE_ICE_BREAKER_GAMES[0]);
        expect(pickRandomGame(() => 0.2, AVAILABLE_ICE_BREAKER_GAMES)).toBeNull();
    });
});

describe('excluded games', () => {
    it('are stored sanitized and honoured by a random pick', () => {
        const state = setExcludedGames({}, ['emoji', 'bogus', 'wyr']);
        expect(state.excludedGames).toEqual(['emoji', 'wyr']);
        const picked = buildSelectedGameState(state, 'random', { rng: () => 0.99, now: 1 });
        expect(['questions', 'justone', 'fakedef']).toContain(picked.game);
        expect(picked.excludedGames).toEqual(['emoji', 'wyr']);
        expect(buildSelectedGameState(setExcludedGames({}, AVAILABLE_ICE_BREAKER_GAMES), 'random')).toBeNull();
    });
});

describe('topUpPool', () => {
    it('adds canned items until the minimum, skipping duplicates', () => {
        expect(topUpPool(['a', 'b'], ['b', 'c', 'd', 'e'], 4)).toEqual(['a', 'b', 'c', 'd']);
        expect(topUpPool(['a', 'b', 'c'], ['x'], 2)).toEqual(['a', 'b', 'c']);
    });
});

describe('buildResetGameState', () => {
    it('goes back to the selection screen', () => {
        const state = buildResetGameState({ game: 'questions', step: 'play', spin: { id: 'x', at: 1 } });
        expect(state.game).toBeNull();
        expect(state.step).toBe('select');
        expect(state.spin).toBeUndefined();
    });
});
