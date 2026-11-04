// Would You Rather: pure game rules. Two options, everyone votes, the split is
// revealed. No score: the fun is in seeing where the team stands.
import { normalizeAnswer } from './emojiCharades.js';

export const WYR_ROUNDS = 3;
export const WYR_ROUND_SECONDS = 20;

// Office-safe by construction. Used when Gemini is unavailable (and by the dev mock).
export const CANNED_DILEMMAS = [
    { a: 'Avoir toujours 5 minutes de retard', b: 'Avoir toujours 20 minutes d\'avance' },
    { a: 'Ne plus jamais manger de fromage', b: 'Ne plus jamais manger de chocolat' },
    { a: 'Parler toutes les langues', b: 'Jouer de tous les instruments' },
    { a: 'Vivre sans musique', b: 'Vivre sans séries' },
    { a: 'Avoir un bouton pause sur la vie', b: 'Avoir un bouton retour 10 secondes' },
    { a: 'Être toujours un peu trop habillé', b: 'Être toujours un peu trop décontracté' },
    { a: 'Un été sans fin', b: 'Un hiver sans fin' },
    { a: 'Ne plus jamais utiliser de GPS', b: 'Ne plus jamais utiliser de calculatrice' },
    { a: 'Travailler 4 jours de 10 h', b: 'Travailler 5 jours de 8 h' },
    { a: 'Un clone pour les réunions', b: 'Un clone pour le ménage' },
    { a: 'Vivre à la montagne', b: 'Vivre à la mer' },
    { a: 'Ne plus jamais faire la queue', b: 'Ne plus jamais chercher une place de parking' },
    { a: 'Être invisible', b: 'Pouvoir voler' },
    { a: 'Un café parfait chaque matin', b: 'Un lit parfait chaque soir' },
    { a: 'Tout le monde entend tes pensées', b: 'Tu entends les pensées de tout le monde' },
    { a: 'Ne plus jamais recevoir de notifications', b: 'Ne plus jamais avoir de réunions' },
    { a: 'Parler aux animaux', b: 'Parler à ton toi d\'il y a dix ans' },
    { a: 'Petit-déjeuner à volonté toute ta vie', b: 'Dessert à volonté toute ta vie' },
    { a: 'Manger uniquement sucré', b: 'Manger uniquement salé' },
    { a: 'Chanter au lieu de parler', b: 'Danser au lieu de marcher' },
    { a: 'Internet illimité mais lent', b: 'Internet rapide mais une heure par jour' },
    { a: 'Un wifi parfait partout', b: 'Une batterie infinie' },
    { a: 'Revivre la même journée pendant un an', b: 'Sauter un an d\'un coup' },
    { a: 'Une pizza par jour', b: 'Un restaurant gastronomique par mois' },
];

// Last line of defence after the prompt: anything matching is dropped.
const BANNED = /\b(caca|pipi|merde|crotte|vomi|sexe|sexuel|nu[es]?|porno|p[ée]nis|vagin|fesse|cul|pute|salope|bite|couille|sang|gore|mort|tuer|cadavre|suicide|drogue|cocaïne|coke|alcoolique|viol|nazi|hitler|religion|dieu|politique|élection|handicap|gros|maigre|moche)\b/iu;

const cleanOption = (text) => String(text ?? '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/u, '').slice(0, 120);

export const sanitizeDilemmas = (raw) => {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const a = cleanOption(item.a);
        const b = cleanOption(item.b);
        if (a.length < 3 || b.length < 3) continue;
        if (BANNED.test(a) || BANNED.test(b)) continue;
        const key = `${normalizeAnswer(a)}|${normalizeAnswer(b)}`;
        if (normalizeAnswer(a) === normalizeAnswer(b) || seen.has(key)) continue;
        seen.add(key);
        out.push({ a, b });
    }
    return out;
};

export const startWyrGame = (state, dilemmas, now = Date.now(), pool = []) => ({
    ...state,
    game: 'wyr',
    step: 'play',
    round: 0,
    dilemmas,
    dilemmaPool: pool,
    roundStartedAt: now,
    submissions: {},
    scores: {},
    players: {},
    winnerId: undefined,
    winnerName: undefined,
});

// Admin skips the current dilemma: next one from the pool, votes are wiped.
export const skipWyrDilemma = (state, now = Date.now()) => {
    if (state?.game !== 'wyr' || state.step !== 'play') return { error: 'No round to skip' };
    const [next, ...pool] = state.dilemmaPool ?? [];
    if (!next) return { error: 'No spare dilemma left' };
    const roundKey = String(state.round ?? 0);
    const submissions = { ...(state.submissions ?? {}) };
    delete submissions[roundKey];
    return {
        state: {
            ...state,
            dilemmas: state.dilemmas.map((d, i) => (i === (state.round ?? 0) ? next : d)),
            dilemmaPool: pool,
            submissions,
            roundStartedAt: now,
        },
    };
};

// One vote per player per round, 'a' or 'b'. Reveals once everyone present voted.
export const recordWyrVote = (state, { participantId, name, text, now = Date.now(), participantIds = [] }) => {
    if (state?.game !== 'wyr' || state.step !== 'play') return { error: 'No vote open' };
    if (!state.dilemmas?.[state.round ?? 0]) return { error: 'No dilemma for this round' };
    const choice = String(text ?? '').trim().toLowerCase();
    if (choice !== 'a' && choice !== 'b') return { error: 'Vote must be a or b' };

    const roundKey = String(state.round ?? 0);
    const votes = { ...(state.submissions?.[roundKey] ?? {}) };
    const pid = String(participantId);
    if (votes[pid]) return { error: 'Already voted' };
    votes[pid] = { text: choice, at: now };

    const everyoneVoted = participantIds.length > 0 && participantIds.every(id => Boolean(votes[String(id)]));
    return {
        result: { choice },
        state: {
            ...state,
            step: everyoneVoted ? 'reveal' : 'play',
            submissions: { ...(state.submissions ?? {}), [roundKey]: votes },
            players: { ...(state.players ?? {}), [pid]: name },
        },
    };
};

export const advanceWyrGame = (state, now = Date.now()) => {
    if (state?.game !== 'wyr') return null;
    if (state.step === 'play') return { ...state, step: 'reveal' };
    if (state.step === 'reveal') {
        const next = (state.round ?? 0) + 1;
        if (next < (state.dilemmas?.length ?? 0)) return { ...state, step: 'play', round: next, roundStartedAt: now };
        return { ...state, step: 'done' };
    }
    return null;
};

// While a vote is open, only your own choice is visible; others show as "voted".
export const getVisibleWyrState = (state, userId) => {
    if (!state || state.game !== 'wyr') return state;
    if (state.step !== 'play') return state;
    const round = state.round ?? 0;
    const me = String(userId ?? '');
    const submissions = {};
    for (const [roundKey, byPlayer] of Object.entries(state.submissions ?? {})) {
        submissions[roundKey] = {};
        for (const [pid, vote] of Object.entries(byPlayer ?? {})) {
            submissions[roundKey][pid] = Number(roundKey) === round && pid !== me ? { at: vote.at } : vote;
        }
    }
    return { ...state, submissions };
};
