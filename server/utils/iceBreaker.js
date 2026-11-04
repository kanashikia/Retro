// Ice breaker game registry and state helpers.
// Keep the game ids in sync with src/icebreaker/games.ts (client registry).

export const ICE_BREAKER_GAMES = ['questions', 'emoji', 'justone', 'wyr', 'fakedef', 'airhockey'];

// Games playable today. The others are listed on the client as "coming soon"
// and excluded from the random wheel until their handlers exist.
export const AVAILABLE_ICE_BREAKER_GAMES = ['questions', 'emoji', 'justone', 'wyr', 'fakedef', 'airhockey'];

export const RANDOM_GAME = 'random';

export const isKnownGame = (game) => ICE_BREAKER_GAMES.includes(game);
export const isAvailableGame = (game) => AVAILABLE_ICE_BREAKER_GAMES.includes(game);

// Games the wheel can land on: everything playable minus what the admin switched off.
export const wheelGames = (excluded = []) => {
    const out = AVAILABLE_ICE_BREAKER_GAMES.filter(g => !excluded.includes(g));
    return out;
};

export const pickRandomGame = (rng = Math.random, excluded = []) => {
    const pool = wheelGames(excluded);
    if (pool.length === 0) return null;
    const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
    return pool[index];
};

export const sanitizeExcludedGames = (raw) => (Array.isArray(raw) ? raw.map(String).filter(isAvailableGame) : []);

export const setExcludedGames = (raw, excluded) => ({
    ...normalizeIceBreakerState(raw),
    excludedGames: sanitizeExcludedGames(excluded),
});

// Generic French questions, used only when Gemini could not provide spares.
export const FALLBACK_QUESTIONS = [
    'Quel est le plat que tu pourrais manger tous les jours sans te lasser ?',
    'Si tu devais vivre dans un film ou une série, lequel et pourquoi ?',
    'Quel talent inutile mais impressionnant aimerais-tu avoir ?',
    'Quelle est la pire mode que tu as suivie avec conviction ?',
    'Quel objet de ton bureau raconte le mieux qui tu es ?',
    'Quel super-pouvoir serait franchement pénible au quotidien ?',
    'Quelle chanson te met de bonne humeur à coup sûr ?',
    'Quel endroit du monde te fait rêver sans que tu saches vraiment pourquoi ?',
    'Quelle était ta phobie la plus absurde quand tu étais enfant ?',
    "Quel conseil donnerais-tu à ton toi d'il y a dix ans ?",
    'Si ta vie avait un générique, quel en serait le titre ?',
    'Quelle technologie regrettes-tu secrètement ?',
];

// Make sure a generated list is long enough to play plus a few skips, topping
// it up with canned items that are not already in it.
export const topUpPool = (list, canned, minimum, keyOf = (x) => String(x)) => {
    const out = [...list];
    const seen = new Set(out.map(keyOf));
    for (const item of canned) {
        if (out.length >= minimum) break;
        const key = keyOf(item);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
};

// Legacy sessions only had { questions, currentIndex }. Fill in the generic
// fields so every reader can rely on the same shape.
export const normalizeIceBreakerState = (raw) => {
    const prev = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const questions = Array.isArray(prev.questions) ? prev.questions : [];
    const game = isKnownGame(prev.game) ? prev.game : (questions.length > 0 ? 'questions' : null);
    return {
        ...prev,
        game,
        step: typeof prev.step === 'string' ? prev.step : (game ? 'play' : 'select'),
        round: Number.isInteger(prev.round) ? prev.round : 0,
        questions,
        currentIndex: Number.isInteger(prev.currentIndex) ? prev.currentIndex : 0,
        submissions: prev.submissions && typeof prev.submissions === 'object' ? prev.submissions : {},
        scores: prev.scores && typeof prev.scores === 'object' ? prev.scores : {},
        excludedGames: sanitizeExcludedGames(prev.excludedGames),
    };
};

// Admin picked a game (or "random"). Any previous game progress is dropped.
// `spin` lets clients that receive the update play the wheel animation; late
// joiners compare `spin.at` with now and skip it.
export const buildSelectedGameState = (raw, requested, { rng = Math.random, now = Date.now(), spinId } = {}) => {
    const isRandom = requested === RANDOM_GAME;
    const base = normalizeIceBreakerState(raw);
    const game = isRandom ? pickRandomGame(rng, base.excludedGames) : requested;
    if (!game || !isAvailableGame(game)) return null;
    return {
        ...base,
        ...EMPTY_PROGRESS,
        game,
        step: 'lobby',
        spin: isRandom ? { id: spinId ?? String(now), at: now } : undefined,
    };
};

export const buildResetGameState = (raw) => ({
    ...normalizeIceBreakerState(raw),
    ...EMPTY_PROGRESS,
    game: null,
    step: 'select',
    spin: undefined,
});

// Every per-game field, cleared when a game is (re)selected.
const EMPTY_PROGRESS = {
    round: 0,
    questions: [],
    spareQuestions: [],
    currentIndex: 0,
    submissions: {},
    scores: {},
    players: {},
    charades: [],
    charadePool: [],
    words: [],
    wordPool: [],
    guesses: {},
    dilemmas: [],
    dilemmaPool: [],
    ballots: {},
    votes: {},
    defPool: [],
    teamScore: 0,
    roundStartedAt: undefined,
    winnerId: undefined,
    winnerName: undefined,
};

// Reserve pools hold answers for rounds not played yet: never sent to clients.
const SECRET_KEYS = ['spareQuestions', 'charadePool', 'wordPool', 'dilemmaPool', 'defPool'];
export const stripIceBreakerSecrets = (state) => {
    if (!state || typeof state !== 'object') return state;
    const out = { ...state };
    for (const key of SECRET_KEYS) delete out[key];
    return out;
};

export const shuffle = (list, rng = Math.random) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

// Split into what we play now and what we keep for skips.
export const shuffleSplit = (list, count, rng = Math.random) => {
    const copy = shuffle(list, rng);
    return { picked: copy.slice(0, count), rest: copy.slice(count) };
};

// Questions game: swap the current person's question for their spare, once.
export const skipQuestion = (state) => {
    if (state?.game !== 'questions') return { error: 'Not the questions game' };
    const index = state.currentIndex ?? 0;
    const current = state.questions?.[index];
    if (!current) return { error: 'No question to skip' };
    const spare = state.spareQuestions?.[index];
    if (!spare) return { error: 'No spare question left for this person' };
    const questions = state.questions.map((q, i) => (i === index ? { ...q, question: spare } : q));
    const spareQuestions = state.spareQuestions.map((s, i) => (i === index ? null : s));
    return { state: { ...state, questions, spareQuestions } };
};
