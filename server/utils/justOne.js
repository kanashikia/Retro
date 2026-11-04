// Just One: pure game rules. One player guesses a secret word from the clues
// the others wrote; identical or same-family clues burn before the guess.
// Cooperative: the team scores together, the most useful player is the MVP.
import { isCorrectGuess, normalizeAnswer } from './emojiCharades.js';

export const JUSTONE_MAX_ROUNDS = 5;
export const JUSTONE_COLLECT_SECONDS = 30;
export const JUSTONE_GUESS_SECONDS = 45;
export const JUSTONE_MAX_CLUE_LENGTH = 30;

// Used when Gemini is unavailable or returns nothing usable (and by the dev mock).
export const CANNED_WORDS = [
    'Pirate', 'Chocolat', 'Tour Eiffel', 'Dragon', 'Plage', 'Pompier', 'Licorne', 'Pizza',
    'Vampire', 'Montagne', 'Robot', 'Cirque', 'Fantôme', 'Banane', 'Astronaute', 'Château',
    'Dinosaure', 'Vélo', 'Sorcière', 'Volcan', 'Pingouin', 'Guitare', 'Trésor', 'Zombie',
    'Camping', 'Parapluie', 'Requin', 'Mariage', 'Fusée', 'Chevalier', 'Igloo', 'Carnaval',
    'Pyramide', 'Super-héros', 'Fromage', 'Tornade', 'Sirène', 'Détective', 'Sapin', 'Karaoké',
];

export const sanitizeWords = (raw) => {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        const word = String(item ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
        if (word.length < 2 || !/^[\p{L}\p{N}' \-]+$/u.test(word)) continue;
        const key = normalizeAnswer(word);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(word);
    }
    return out;
};

// Crude French/English stem: plural and feminine endings collapse, so
// "rois" ≈ "roi" and "chatte" ≈ "chat" count as the same clue.
export const stemClue = (text) => {
    let s = normalizeAnswer(text).replace(/ /g, '');
    if (s.length > 3 && /(s|x)$/.test(s)) s = s.slice(0, -1);
    if (s.length > 3 && /e$/.test(s)) s = s.slice(0, -1);
    // "chatte" → "chatt" → "chat"
    if (s.length > 3 && s[s.length - 1] === s[s.length - 2] && !/[aeiouy]/.test(s[s.length - 1])) s = s.slice(0, -1);
    return s;
};

export const isSingleWord = (text) => /^[\p{L}\p{N}'’\-]+$/u.test(String(text ?? '').trim());

// Always maxRounds rounds; guessers rotate through the players present at start,
// so with fewer players some guess twice.
export const buildRounds = (words, participantIds, maxRounds = JUSTONE_MAX_ROUNDS) => {
    const ids = participantIds.map(String);
    if (ids.length === 0) return [];
    const count = Math.min(words.length, maxRounds);
    return Array.from({ length: count }, (_, i) => ({ word: words[i], guesserId: ids[i % ids.length] }));
};

// Admin skips the current word: next one from the pool, clues are wiped and the
// round goes back to writing clues.
export const skipJustOneWord = (state, now = Date.now()) => {
    if (state?.game !== 'justone' || (state.step !== 'collect' && state.step !== 'play')) return { error: 'No round to skip' };
    const [next, ...pool] = state.wordPool ?? [];
    if (!next) return { error: 'No spare word left' };
    const round = state.round ?? 0;
    const roundKey = String(round);
    const submissions = { ...(state.submissions ?? {}) };
    delete submissions[roundKey];
    return {
        state: {
            ...state,
            step: 'collect',
            words: state.words.map((w, i) => (i === round ? { ...w, word: next } : w)),
            wordPool: pool,
            submissions,
            roundStartedAt: now,
        },
    };
};

export const startJustOneGame = (state, words, participantIds, names = {}, now = Date.now(), pool = []) => ({
    ...state,
    game: 'justone',
    step: 'collect',
    round: 0,
    words: buildRounds(words, participantIds),
    wordPool: pool,
    roundStartedAt: now,
    submissions: {},
    guesses: {},
    scores: {},
    players: { ...names },
    teamScore: 0,
    winnerId: undefined,
    winnerName: undefined,
});

const currentRound = (state) => state?.words?.[state.round ?? 0];

// Marks duplicates and clues that give the word away. Moves to the guess step.
export const resolveClues = (state, now = Date.now()) => {
    const roundKey = String(state.round ?? 0);
    const clues = state.submissions?.[roundKey] ?? {};
    const wordStem = stemClue(currentRound(state)?.word ?? '');
    const stems = Object.values(clues).map(c => stemClue(c.text));

    const resolved = {};
    for (const [pid, clue] of Object.entries(clues)) {
        const stem = stemClue(clue.text);
        let reason = null;
        if (!stem || stem === wordStem || stem.includes(wordStem) || wordStem.includes(stem)) reason = 'word';
        else if (stems.filter(s => s === stem).length > 1) reason = 'duplicate';
        resolved[pid] = { ...clue, kept: !reason, reason: reason ?? undefined };
    }
    return {
        ...state,
        step: 'play',
        roundStartedAt: now,
        submissions: { ...(state.submissions ?? {}), [roundKey]: resolved },
    };
};

export const recordJustOneClue = (state, { participantId, name, text, now = Date.now(), participantIds = [] }) => {
    if (state?.game !== 'justone' || state.step !== 'collect') return { error: 'Clues are closed' };
    const round = currentRound(state);
    if (!round) return { error: 'No round in progress' };
    const pid = String(participantId);
    if (pid === String(round.guesserId)) return { error: 'The guesser cannot write a clue' };
    const clue = String(text ?? '').trim().slice(0, JUSTONE_MAX_CLUE_LENGTH);
    if (!clue) return { error: 'Empty clue' };
    if (!isSingleWord(clue)) return { error: 'One word only' };

    const roundKey = String(state.round ?? 0);
    const roundClues = { ...(state.submissions?.[roundKey] ?? {}) };
    if (roundClues[pid]) return { error: 'Clue already locked' };
    roundClues[pid] = { text: clue, at: now };

    const next = {
        ...state,
        submissions: { ...(state.submissions ?? {}), [roundKey]: roundClues },
        players: { ...(state.players ?? {}), [pid]: name },
    };
    const writers = participantIds.map(String).filter(id => id !== String(round.guesserId));
    const everyoneDone = writers.length > 0 && writers.every(id => Boolean(roundClues[id]));
    return { result: { locked: true }, state: everyoneDone ? resolveClues(next, now) : next };
};

const scoreRound = (state, correct) => {
    if (!correct) return { scores: { ...(state.scores ?? {}) }, teamScore: state.teamScore ?? 0 };
    const roundKey = String(state.round ?? 0);
    const scores = { ...(state.scores ?? {}) };
    const guesserId = String(currentRound(state)?.guesserId);
    scores[guesserId] = (scores[guesserId] ?? 0) + 1;
    for (const [pid, clue] of Object.entries(state.submissions?.[roundKey] ?? {})) {
        if (clue.kept) scores[pid] = (scores[pid] ?? 0) + 1;
    }
    return { scores, teamScore: (state.teamScore ?? 0) + 1 };
};

// Empty text = pass. Only the round's guesser may answer.
export const recordJustOneGuess = (state, { participantId, name, text, now = Date.now() }) => {
    if (state?.game !== 'justone' || state.step !== 'play') return { error: 'Not guessing right now' };
    const round = currentRound(state);
    if (!round) return { error: 'No round in progress' };
    const pid = String(participantId);
    if (pid !== String(round.guesserId)) return { error: 'Only the guesser can answer' };

    const guess = String(text ?? '').trim().slice(0, 80);
    const correct = guess ? isCorrectGuess(guess, { answer: round.word, accepted: [] }) : false;
    const { scores, teamScore } = scoreRound(state, correct);
    return {
        result: { correct },
        state: {
            ...state,
            step: 'reveal',
            guesses: { ...(state.guesses ?? {}), [String(state.round ?? 0)]: { text: guess, correct, at: now } },
            scores,
            teamScore,
            players: { ...(state.players ?? {}), [pid]: name ?? state.players?.[pid] },
        },
    };
};

export const recordJustOneSubmission = (state, input) => {
    if (state?.step === 'collect') return recordJustOneClue(state, input);
    if (state?.step === 'play') return recordJustOneGuess(state, input);
    return { error: 'Nothing to submit right now' };
};

const winnerOf = (state) => {
    const entries = Object.entries(state.scores ?? {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0 || entries[0][1] <= 0) return null;
    return { id: entries[0][0], name: state.players?.[entries[0][0]] ?? '' };
};

export const advanceJustOneGame = (state, now = Date.now()) => {
    if (state?.game !== 'justone') return null;
    if (state.step === 'collect') return resolveClues(state, now);
    if (state.step === 'play') {
        const guesserId = currentRound(state)?.guesserId;
        return recordJustOneGuess(state, { participantId: guesserId, text: '', now }).state ?? null;
    }
    if (state.step === 'reveal') {
        const next = (state.round ?? 0) + 1;
        if (next < (state.words?.length ?? 0)) {
            return { ...state, step: 'collect', round: next, roundStartedAt: now };
        }
        const winner = winnerOf(state);
        return { ...state, step: 'done', winnerId: winner?.id, winnerName: winner?.name };
    }
    return null;
};

// What a given user may see:
// - the guesser never sees the current word before the reveal, nobody sees future words;
// - while clues are being written, only your own clue text is visible;
// - while guessing, the guesser sees kept clues only (burned ones stay hidden).
export const getVisibleJustOneState = (state, userId) => {
    if (!state || state.game !== 'justone') return state;
    const round = state.round ?? 0;
    const me = String(userId ?? '');
    const current = currentRound(state);
    const iAmGuesser = current && String(current.guesserId) === me;
    const roundOpen = state.step === 'collect' || state.step === 'play';

    const words = (state.words ?? []).map((w, i) => {
        if (i > round) return { guesserId: w.guesserId };
        if (i === round && roundOpen && iAmGuesser) return { guesserId: w.guesserId };
        return w;
    });

    const submissions = {};
    for (const [roundKey, byPlayer] of Object.entries(state.submissions ?? {})) {
        const r = Number(roundKey);
        submissions[roundKey] = {};
        for (const [pid, clue] of Object.entries(byPlayer ?? {})) {
            if (r !== round || !roundOpen || pid === me) { submissions[roundKey][pid] = clue; continue; }
            if (state.step === 'collect') submissions[roundKey][pid] = { at: clue.at };
            else submissions[roundKey][pid] = iAmGuesser && !clue.kept
                ? { at: clue.at, kept: false }
                : clue;
        }
    }

    return { ...state, words, submissions };
};
