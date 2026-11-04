// Emoji Charades: pure game rules. The socket handlers in server/index.js call
// these with the current iceBreakerState and persist what comes back.

export const EMOJI_ROUNDS = 5;
export const EMOJI_ROUND_SECONDS = 30;
export const EMOJI_MAX_GUESS_LENGTH = 80;

const RANK_POINTS = [10, 8, 6];
const OTHER_RANK_POINTS = 5;

// Used when Gemini is unavailable or returns nothing usable (and by the dev mock).
export const CANNED_CHARADES = [
    { emojis: '🦁👑🌅', answer: 'Le Roi Lion', accepted: ['The Lion King', 'Roi Lion'] },
    { emojis: '🚢🧊💑', answer: 'Titanic', accepted: [] },
    { emojis: '🦈🏖️😱', answer: 'Les Dents de la mer', accepted: ['Jaws'] },
    { emojis: '🧙‍♂️💍🌋', answer: 'Le Seigneur des anneaux', accepted: ['The Lord of the Rings', 'Lord of the Rings', 'Seigneur des anneaux'] },
    { emojis: '🐠🔍🌊', answer: 'Le Monde de Nemo', accepted: ['Finding Nemo', 'Nemo'] },
    { emojis: '🤖❤️🌱', answer: 'WALL-E', accepted: ['Wall-E', 'Walle'] },
    { emojis: '🧪🧑‍🔬💰', answer: 'Breaking Bad', accepted: [] },
    { emojis: '🐉👑⚔️', answer: 'Game of Thrones', accepted: ['Le Trône de fer', 'GoT'] },
    { emojis: '🦖🏝️🚙', answer: 'Jurassic Park', accepted: [] },
    { emojis: '👽📞🚲', answer: 'E.T.', accepted: ['ET', 'E.T. l\'extra-terrestre', 'E.T. the Extra-Terrestrial'] },
    { emojis: '🏠🎈👴', answer: 'Là-haut', accepted: ['Up', 'La haut'] },
    { emojis: '🕷️🧑🏙️', answer: 'Spider-Man', accepted: ['Spiderman'] },
    { emojis: '👸❄️⛄', answer: 'La Reine des neiges', accepted: ['Frozen', 'Reine des neiges'] },
    { emojis: '🧑‍🚀🪐🕰️', answer: 'Interstellar', accepted: [] },
    { emojis: '🎭💵🏦', answer: 'La Casa de Papel', accepted: ['Money Heist', 'Casa de Papel'] },
    { emojis: '🧒🚲👾', answer: 'Stranger Things', accepted: [] },
    { emojis: '🐀👨‍🍳🇫🇷', answer: 'Ratatouille', accepted: [] },
    { emojis: '🦇🃏🌃', answer: 'The Dark Knight', accepted: ['Batman', 'Le Chevalier noir', 'Dark Knight'] },
];

const LEADING_ARTICLES = new Set(['le', 'la', 'les', 'l', 'the', 'a', 'an', 'un', 'une', 'des', 'du', 'de', 'd']);

export const normalizeAnswer = (text) => {
    const tokens = String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);
    while (tokens.length > 1 && LEADING_ARTICLES.has(tokens[0])) tokens.shift();
    return tokens.join(' ');
};

const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
            cur[j] = Math.min(
                prev[j] + 1,
                cur[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        prev = cur;
    }
    return prev[b.length];
};

const closeEnough = (guess, target) => {
    if (!guess || !target) return false;
    if (guess === target) return true;
    const tolerance = target.length >= 10 ? 2 : target.length >= 5 ? 1 : 0;
    return tolerance > 0 && levenshtein(guess, target) <= tolerance;
};

export const isCorrectGuess = (guess, charade) => {
    const g = normalizeAnswer(guess);
    if (!g) return false;
    const targets = [charade?.answer, ...(Array.isArray(charade?.accepted) ? charade.accepted : [])].map(normalizeAnswer);
    return targets.some(t => closeEnough(g, t));
};

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('fr', { granularity: 'grapheme' })
    : null;

const graphemes = (str) => segmenter
    ? Array.from(segmenter.segment(str), s => s.segment)
    : Array.from(str);

// Exactly three pictographic clusters, nothing else but whitespace.
export const countEmojis = (str) => {
    let emojis = 0;
    for (const g of graphemes(String(str ?? ''))) {
        if (/^\s+$/u.test(g) || g === '️' || g === '‍') continue;
        // Flags are regional-indicator pairs, not Extended_Pictographic.
        if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(g)) emojis += 1;
        else return -1;
    }
    return emojis;
};

export const sanitizeCharades = (raw) => {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const emojis = String(item.emojis ?? '').replace(/\s+/g, '').slice(0, 40);
        const answer = String(item.answer ?? '').trim().slice(0, 80);
        const accepted = Array.isArray(item.accepted)
            ? item.accepted.map(a => String(a ?? '').trim().slice(0, 80)).filter(Boolean).slice(0, 6)
            : [];
        if (!answer || countEmojis(emojis) !== 3) continue;
        const key = normalizeAnswer(answer);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({ emojis, answer, accepted });
    }
    return out;
};

export const pointsForRank = (rank) => RANK_POINTS[rank - 1] ?? OTHER_RANK_POINTS;

export const startEmojiGame = (state, charades, now = Date.now(), pool = []) => ({
    ...state,
    game: 'emoji',
    step: 'play',
    round: 0,
    charades,
    charadePool: pool,
    roundStartedAt: now,
    submissions: {},
    scores: {},
    players: {},
    winnerId: undefined,
    winnerName: undefined,
});

// Admin skips the current charade: the next one from the pool replaces it and
// the round restarts. Points already scored this round are taken back.
export const skipEmojiCharade = (state, now = Date.now()) => {
    if (state?.game !== 'emoji' || state.step !== 'play') return { error: 'No round to skip' };
    const [next, ...pool] = state.charadePool ?? [];
    if (!next) return { error: 'No spare charade left' };
    const roundKey = String(state.round ?? 0);
    const scores = { ...(state.scores ?? {}) };
    for (const [pid, sub] of Object.entries(state.submissions?.[roundKey] ?? {})) {
        if (sub.points) scores[pid] = Math.max(0, (scores[pid] ?? 0) - sub.points);
    }
    const submissions = { ...(state.submissions ?? {}) };
    delete submissions[roundKey];
    return {
        state: {
            ...state,
            charades: state.charades.map((c, i) => (i === (state.round ?? 0) ? next : c)),
            charadePool: pool,
            submissions,
            scores,
            roundStartedAt: now,
        },
    };
};

// One guess per player per round. Correct guesses are ranked by arrival.
export const recordEmojiGuess = (state, { participantId, name, text, now = Date.now(), participantIds = [] }) => {
    if (state?.game !== 'emoji' || state.step !== 'play') return { error: 'No round in progress' };
    const charade = state.charades?.[state.round];
    if (!charade) return { error: 'No charade for this round' };
    const guess = String(text ?? '').trim().slice(0, EMOJI_MAX_GUESS_LENGTH);
    if (!guess) return { error: 'Empty guess' };

    const roundKey = String(state.round);
    const roundSubmissions = { ...(state.submissions?.[roundKey] ?? {}) };
    if (roundSubmissions[participantId]) return { error: 'Already answered this round' };

    const correct = isCorrectGuess(guess, charade);
    const rank = correct ? Object.values(roundSubmissions).filter(s => s.correct).length + 1 : 0;
    const points = correct ? pointsForRank(rank) : 0;
    roundSubmissions[participantId] = { text: guess, correct, rank, points, at: now };

    const scores = { ...(state.scores ?? {}) };
    scores[participantId] = (scores[participantId] ?? 0) + points;

    const everyoneAnswered = participantIds.length > 0
        && participantIds.every(id => Boolean(roundSubmissions[String(id)]));

    return {
        result: { correct, rank, points },
        state: {
            ...state,
            step: everyoneAnswered ? 'reveal' : 'play',
            submissions: { ...(state.submissions ?? {}), [roundKey]: roundSubmissions },
            scores,
            players: { ...(state.players ?? {}), [participantId]: name },
        },
    };
};

const winnerOf = (state) => {
    const entries = Object.entries(state.scores ?? {});
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    const [id, score] = entries[0];
    if (score <= 0) return null;
    return { id, name: state.players?.[id] ?? '' };
};

export const advanceEmojiGame = (state, now = Date.now()) => {
    if (state?.game !== 'emoji') return null;
    if (state.step === 'play') return { ...state, step: 'reveal' };
    if (state.step === 'reveal') {
        const next = (state.round ?? 0) + 1;
        if (next < (state.charades?.length ?? 0)) {
            return { ...state, step: 'play', round: next, roundStartedAt: now };
        }
        const winner = winnerOf(state);
        return { ...state, step: 'done', winnerId: winner?.id, winnerName: winner?.name };
    }
    return null;
};

// What a given user may see: no answers before the reveal, no other players'
// guesses while the round is open (a correct guess would leak the answer).
export const getVisibleEmojiState = (state, userId) => {
    if (!state || state.game !== 'emoji') return state;
    const round = state.round ?? 0;
    const revealedUpTo = state.step === 'play' ? round - 1 : round;
    const me = String(userId ?? '');

    const charades = (state.charades ?? []).map((c, i) => (
        i <= revealedUpTo ? c : { emojis: c.emojis }
    ));

    const submissions = {};
    for (const [roundKey, byPlayer] of Object.entries(state.submissions ?? {})) {
        const r = Number(roundKey);
        const open = state.step === 'play' && r === round;
        submissions[roundKey] = {};
        for (const [pid, sub] of Object.entries(byPlayer ?? {})) {
            submissions[roundKey][pid] = open && pid !== me
                ? { correct: sub.correct, rank: sub.rank, points: sub.points, at: sub.at }
                : sub;
        }
    }

    return { ...state, charades, submissions };
};
