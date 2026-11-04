// Fake Definition: pure game rules. A rare word, everyone invents a definition,
// then everyone votes for the one they believe is the real one. Points for
// fooling others and for spotting the truth.
import { normalizeAnswer } from './emojiCharades.js';
import { shuffle } from './iceBreaker.js';

export const FAKEDEF_ROUNDS = 3;
export const FAKEDEF_COLLECT_SECONDS = 60;
export const FAKEDEF_VOTE_SECONDS = 45;
export const FAKEDEF_MAX_DEF_LENGTH = 160;
export const FAKEDEF_POINTS_FOOLED = 2;   // someone voted for your fake definition
export const FAKEDEF_POINTS_SPOTTED = 1;  // you voted for the real one

// Real dictionary words with faithful short definitions. Used when Gemini is
// unavailable (and by the dev mock).
export const CANNED_FAKEDEFS = [
    { word: 'Acribie', definition: 'Exactitude et soin minutieux apportés à un travail' },
    { word: 'Pandiculation', definition: "Action de s'étirer en bâillant" },
    { word: 'Nycthémère', definition: "Durée de vingt-quatre heures comprenant un jour et une nuit" },
    { word: 'Coruscant', definition: 'Brillant, étincelant' },
    { word: 'Sérendipité', definition: 'Fait de faire une découverte heureuse par hasard' },
    { word: 'Apophtegme', definition: 'Parole mémorable ayant valeur de maxime' },
    { word: 'Zinzolin', definition: 'Couleur violette tirant sur le rouge' },
    { word: 'Fuligineux', definition: 'Qui a la couleur de la suie, noirâtre' },
    { word: 'Hapax', definition: "Mot qui n'apparaît qu'une seule fois dans un corpus de textes" },
    { word: 'Amphigouri', definition: 'Discours ou écrit volontairement obscur et confus' },
    { word: 'Esperluette', definition: "Signe typographique représentant le mot « et »" },
    { word: 'Palinodie', definition: "Rétractation, changement complet d'opinion" },
    { word: 'Logorrhée', definition: 'Flot de paroles abondant et désordonné' },
    { word: 'Opisthographe', definition: 'Document écrit au recto et au verso' },
    { word: 'Vétille', definition: 'Chose insignifiante, détail sans importance' },
    { word: 'Cacographie', definition: 'Écriture ou orthographe défectueuse' },
    { word: 'Sycophante', definition: 'Délateur, dénonciateur' },
    { word: 'Thuriféraire', definition: "Flatteur, personne qui encense quelqu'un" },
    { word: 'Anachorète', definition: 'Religieux qui vit retiré dans la solitude' },
    { word: 'Lapalissade', definition: 'Évidence énoncée comme si elle était une vérité profonde' },
];

const cleanText = (text, max) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export const sanitizeFakeDefs = (raw) => {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const word = cleanText(item.word, 40);
        const definition = cleanText(item.definition, FAKEDEF_MAX_DEF_LENGTH).replace(/[.]+$/u, '');
        if (word.length < 3 || definition.length < 8) continue;
        if (!/^[\p{L}' \-]+$/u.test(word)) continue;
        const key = normalizeAnswer(word);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({ word, definition });
    }
    return out;
};

export const startFakeDefGame = (state, entries, now = Date.now(), pool = []) => ({
    ...state,
    game: 'fakedef',
    step: 'collect',
    round: 0,
    words: entries.map(e => ({ word: e.word, definition: e.definition })),
    defPool: pool,
    roundStartedAt: now,
    submissions: {},
    ballots: {},
    votes: {},
    scores: {},
    players: {},
    winnerId: undefined,
    winnerName: undefined,
});

const currentRound = (state) => state?.words?.[state.round ?? 0];

// Closes the writing step: the real definition and every fake one are shuffled
// into anonymous ballots. Nobody is told which is which until the reveal.
export const openFakeDefVote = (state, now = Date.now(), rng = Math.random) => {
    const roundKey = String(state.round ?? 0);
    const real = currentRound(state)?.definition ?? '';
    const entries = [{ key: 'real', text: real }];
    for (const [pid, sub] of Object.entries(state.submissions?.[roundKey] ?? {})) {
        if (sub?.text) entries.push({ key: pid, text: sub.text });
    }
    return {
        ...state,
        step: 'play',
        roundStartedAt: now,
        ballots: { ...(state.ballots ?? {}), [roundKey]: shuffle(entries, rng) },
    };
};

export const recordFakeDef = (state, { participantId, name, text, now = Date.now(), participantIds = [] }) => {
    if (state?.game !== 'fakedef' || state.step !== 'collect') return { error: 'Definitions are closed' };
    if (!currentRound(state)) return { error: 'No round in progress' };
    const definition = cleanText(text, FAKEDEF_MAX_DEF_LENGTH);
    if (definition.length < 3) return { error: 'Write a definition first' };

    const pid = String(participantId);
    const roundKey = String(state.round ?? 0);
    const roundSubs = { ...(state.submissions?.[roundKey] ?? {}) };
    if (roundSubs[pid]) return { error: 'Definition already locked' };
    roundSubs[pid] = { text: definition, at: now };

    const next = {
        ...state,
        submissions: { ...(state.submissions ?? {}), [roundKey]: roundSubs },
        players: { ...(state.players ?? {}), [pid]: name },
    };
    const everyoneDone = participantIds.length > 0 && participantIds.map(String).every(id => Boolean(roundSubs[id]));
    return { result: { locked: true }, state: everyoneDone ? openFakeDefVote(next, now) : next };
};

const scoreRound = (state) => {
    const roundKey = String(state.round ?? 0);
    const ballots = state.ballots?.[roundKey] ?? [];
    const scores = { ...(state.scores ?? {}) };
    for (const [voter, vote] of Object.entries(state.votes?.[roundKey] ?? {})) {
        const target = ballots[vote.index];
        if (!target) continue;
        if (target.key === 'real') scores[voter] = (scores[voter] ?? 0) + FAKEDEF_POINTS_SPOTTED;
        else scores[target.key] = (scores[target.key] ?? 0) + FAKEDEF_POINTS_FOOLED;
    }
    return scores;
};

export const recordFakeDefVote = (state, { participantId, text, now = Date.now(), participantIds = [] }) => {
    if (state?.game !== 'fakedef' || state.step !== 'play') return { error: 'No vote open' };
    const roundKey = String(state.round ?? 0);
    const ballots = state.ballots?.[roundKey] ?? [];
    const index = Number.parseInt(String(text ?? ''), 10);
    if (!Number.isInteger(index) || index < 0 || index >= ballots.length) return { error: 'Pick a definition' };
    const pid = String(participantId);
    if (ballots[index].key === pid) return { error: 'You cannot vote for your own definition' };

    const roundVotes = { ...(state.votes?.[roundKey] ?? {}) };
    if (roundVotes[pid]) return { error: 'Already voted' };
    roundVotes[pid] = { index, at: now };

    const next = { ...state, votes: { ...(state.votes ?? {}), [roundKey]: roundVotes } };
    const everyoneVoted = participantIds.length > 0 && participantIds.map(String).every(id => Boolean(roundVotes[id]));
    if (!everyoneVoted) return { result: { voted: true }, state: next };
    return { result: { voted: true }, state: { ...next, step: 'reveal', scores: scoreRound(next) } };
};

export const recordFakeDefSubmission = (state, input) => {
    if (state?.step === 'collect') return recordFakeDef(state, input);
    if (state?.step === 'play') return recordFakeDefVote(state, input);
    return { error: 'Nothing to submit right now' };
};

const winnerOf = (state) => {
    const entries = Object.entries(state.scores ?? {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0 || entries[0][1] <= 0) return null;
    return { id: entries[0][0], name: state.players?.[entries[0][0]] ?? '' };
};

export const advanceFakeDefGame = (state, now = Date.now(), rng = Math.random) => {
    if (state?.game !== 'fakedef') return null;
    if (state.step === 'collect') return openFakeDefVote(state, now, rng);
    if (state.step === 'play') return { ...state, step: 'reveal', scores: scoreRound(state) };
    if (state.step === 'reveal') {
        const next = (state.round ?? 0) + 1;
        if (next < (state.words?.length ?? 0)) return { ...state, step: 'collect', round: next, roundStartedAt: now };
        const winner = winnerOf(state);
        return { ...state, step: 'done', winnerId: winner?.id, winnerName: winner?.name };
    }
    return null;
};

// Admin skips the current word: next one from the pool, everything written or
// voted this round is wiped, back to writing.
export const skipFakeDefWord = (state, now = Date.now()) => {
    if (state?.game !== 'fakedef' || (state.step !== 'collect' && state.step !== 'play')) return { error: 'No round to skip' };
    const [next, ...pool] = state.defPool ?? [];
    if (!next) return { error: 'No spare word left' };
    const round = state.round ?? 0;
    const roundKey = String(round);
    const submissions = { ...(state.submissions ?? {}) }; delete submissions[roundKey];
    const ballots = { ...(state.ballots ?? {}) }; delete ballots[roundKey];
    const votes = { ...(state.votes ?? {}) }; delete votes[roundKey];
    return {
        state: {
            ...state,
            step: 'collect',
            words: state.words.map((w, i) => (i === round ? { word: next.word, definition: next.definition } : w)),
            defPool: pool,
            submissions,
            ballots,
            votes,
            roundStartedAt: now,
        },
    };
};

// What a given user may see:
// - the real definition only once the round is revealed, never for future rounds;
// - other players' fake definitions only once the vote opens, and then anonymously;
// - other players' votes only at the reveal.
export const getVisibleFakeDefState = (state, userId) => {
    if (!state || state.game !== 'fakedef') return state;
    const round = state.round ?? 0;
    const me = String(userId ?? '');
    const revealedUpTo = state.step === 'reveal' || state.step === 'done' ? round : round - 1;

    const words = (state.words ?? []).map((w, i) => (i <= revealedUpTo ? w : { word: i <= round ? w.word : undefined }));

    const submissions = {};
    for (const [roundKey, byPlayer] of Object.entries(state.submissions ?? {})) {
        const r = Number(roundKey);
        submissions[roundKey] = {};
        for (const [pid, sub] of Object.entries(byPlayer ?? {})) {
            const hidden = r === round && (state.step === 'collect' || state.step === 'play') && pid !== me;
            submissions[roundKey][pid] = hidden ? { at: sub.at } : sub;
        }
    }

    const ballots = {};
    for (const [roundKey, list] of Object.entries(state.ballots ?? {})) {
        const open = Number(roundKey) === round && state.step === 'play';
        ballots[roundKey] = (list ?? []).map(b => (open ? { text: b.text } : b));
    }

    const votes = {};
    for (const [roundKey, byPlayer] of Object.entries(state.votes ?? {})) {
        const open = Number(roundKey) === round && state.step === 'play';
        votes[roundKey] = {};
        for (const [pid, vote] of Object.entries(byPlayer ?? {})) {
            votes[roundKey][pid] = open && pid !== me ? { at: vote.at } : vote;
        }
    }

    return { ...state, words, submissions, ballots, votes };
};
