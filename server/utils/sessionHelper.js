import jwt from 'jsonwebtoken';

export const isBrainstormPhase = (sessionData) => sessionData?.phase === 'BRAINSTORM';

export const isSessionAdmin = (sessionData, user) =>
    !!user?.isAdmin || String(sessionData?.adminId) === String(user?.id);

export const getVisibleTicketsForUser = (sessionData, user) => {
    const tickets = Array.isArray(sessionData?.tickets) ? sessionData.tickets : [];

    if (!isBrainstormPhase(sessionData) || isSessionAdmin(sessionData, user)) {
        return tickets;
    }

    return tickets.filter((ticket) => {
        if (!ticket) return false;
        if (!ticket.authorId) return false;
        return String(ticket.authorId) === String(user?.id);
    });
};

export const buildVisibleSessionForUser = (sessionData, user, status) => ({
    ...sessionData,
    status: status || sessionData.status,
    tickets: getVisibleTicketsForUser(sessionData, user)
});

export const sanitizeUser = (user) => {
    const id = String(user?.id || '').trim();
    const name = String(user?.name || '').trim().slice(0, 64);
    return {
        id,
        name: name || 'Anonymous',
        isAdmin: false,
        isReady: !!user?.isReady
    };
};

export const verifyAdminTokenForUser = (token, userId) => {
    if (!token || !userId) return false;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return String(decoded?.id) === String(userId);
    } catch {
        return false;
    }
};

export const applyParticipantVotingUpdate = (existingData, incomingData, actorId) => {
    const existingThemes = Array.isArray(existingData?.themes) ? existingData.themes : [];
    const incomingThemes = Array.isArray(incomingData?.themes) ? incomingData.themes : [];
    const maxVotesPerUser = Number(process.env.MAX_VOTES_PER_USER || 5);

    const actorVotesUsed = existingThemes.reduce((acc, theme) => {
        const voterIds = Array.isArray(theme?.voterIds) ? theme.voterIds : [];
        return acc + voterIds.filter((id) => String(id) === String(actorId)).length;
    }, 0);

    if (actorVotesUsed >= maxVotesPerUser) {
        return { ...existingData };
    }

    const incomingById = new Map(incomingThemes.map((theme) => [theme?.id, theme]));
    let voteApplied = false;

    const themes = existingThemes.map((theme) => {
        const source = incomingById.get(theme.id);
        const existingVoterIds = Array.isArray(theme.voterIds) ? theme.voterIds : [];
        const incomingVoterIds = Array.isArray(source?.voterIds) ? source.voterIds : [];

        const existingActorVotes = existingVoterIds.filter((id) => String(id) === String(actorId)).length;
        const incomingActorVotes = incomingVoterIds.filter((id) => String(id) === String(actorId)).length;
        const wantsAnotherVote = incomingActorVotes > existingActorVotes;

        if (!voteApplied && wantsAnotherVote) {
            voteApplied = true;
            return {
                ...theme,
                votes: Number(theme.votes || 0) + 1,
                voterIds: [...existingVoterIds, actorId]
            };
        }

        return theme;
    });

    return {
        ...existingData,
        themes
    };
};

export const calculateFallbackAssignments = (tickets, themes, assignedTicketIds) => {
    const tokenize = (value) =>
        String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);

    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'to', 'of', 'for', 'in', 'on',
        'de', 'du', 'des', 'la', 'le', 'les', 'et', 'ou', 'un', 'une',
        'what', 'went', 'well', 'next', 'try', 'version'
    ]);

    const themeLexicon = themes.map((theme) => {
        const words = new Set(
            [...tokenize(theme.name), ...tokenize(theme.description)].filter((w) => !stopWords.has(w))
        );
        return { themeId: theme.id, words };
    });

    const newAssignments = [];
    tickets.forEach((ticket) => {
        if (assignedTicketIds.has(ticket.id)) return;

        const ticketWords = new Set(tokenize(ticket.text).filter((w) => !stopWords.has(w)));
        let bestThemeId = themes[0]?.id;
        let bestScore = -1;

        themeLexicon.forEach(({ themeId, words }) => {
            let score = 0;
            ticketWords.forEach((w) => {
                if (words.has(w)) score += 1;
            });
            if (score > bestScore) {
                bestScore = score;
                bestThemeId = themeId;
            }
        });

        newAssignments.push({
            ticketId: ticket.id,
            themeId: bestThemeId || themes[0]?.id
        });
    });
    return newAssignments;
};
