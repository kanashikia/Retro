
import { Ticket, ThemeGroup } from "../types";
import { Socket } from "socket.io-client";

export const groupTicketsWithAI = async (socket: Socket, sessionId: string, tickets: Ticket[]): Promise<{ themes: ThemeGroup[], ticketAssignments: Record<string, string> }> => {
  return new Promise((resolve) => {
    const fallbackTheme: ThemeGroup = {
      id: 'misc',
      name: 'General Topics',
      description: 'Consolidated team feedback for review',
      votes: 0,
      voterIds: []
    };
    const fallbackAssignments = tickets.reduce((acc, t) => ({ ...acc, [t.id]: fallbackTheme.id }), {});

    socket.emit('ai-group-tickets', { sessionId, tickets }, (response: any) => {
      if (!response || response.error) {
        console.error("AI Grouping failed:", response?.error || 'Empty AI response');
        resolve({
          themes: [fallbackTheme],
          ticketAssignments: fallbackAssignments
        });
      } else {
        const themes = Array.isArray(response?.data?.themes) ? response.data.themes : [];
        const assignments = Array.isArray(response?.data?.assignments) ? response.data.assignments : [];
        const ticketAssignments: Record<string, string> = {};
        assignments.forEach((a: any) => {
          if (a?.ticketId != null && a?.themeId != null) {
            ticketAssignments[String(a.ticketId)] = String(a.themeId);
          }
        });

        const formattedThemes = themes
          .filter((t: any) => t?.id != null && String(t.id).trim().length > 0)
          .map((t: any) => ({
            id: String(t.id),
            name: String(t?.name ?? 'Untitled Group'),
            description: String(t?.description ?? ''),
            votes: 0,
            voterIds: []
          }));

        if (formattedThemes.length === 0) {
          resolve({
            themes: [fallbackTheme],
            ticketAssignments: fallbackAssignments
          });
          return;
        }

        const validThemeIds = new Set(formattedThemes.map((t) => t.id));
        const firstThemeId = formattedThemes[0].id || fallbackTheme.id;
        tickets.forEach((ticket) => {
          const assignment = ticketAssignments[String(ticket.id)];
          if (!assignment || !validThemeIds.has(assignment)) {
            ticketAssignments[String(ticket.id)] = firstThemeId;
          }
        });

        resolve({
          themes: formattedThemes,
          ticketAssignments
        });
      }
    });
  });
};
