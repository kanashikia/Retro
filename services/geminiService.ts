
import { Ticket, ThemeGroup } from "../types";
import { Socket } from "socket.io-client";

export const groupTicketsWithAI = async (socket: Socket, sessionId: string, tickets: Ticket[], userId: string): Promise<{ themes: ThemeGroup[], ticketAssignments: Record<string, string> }> => {
  return new Promise((resolve) => {
    socket.emit('ai-group-tickets', { sessionId, tickets, userId }, (response: any) => {
      if (response.error) {
        console.error("AI Grouping failed:", response.error);
        resolve({
          themes: [{ id: 'misc', name: 'General Topics', description: 'Consolidated team feedback for review', votes: 0, voterIds: [] }],
          ticketAssignments: tickets.reduce((acc, t) => ({ ...acc, [t.id]: 'misc' }), {})
        });
      } else {
        const { themes, assignments } = response.data;
        const ticketAssignments: Record<string, string> = {};
        assignments.forEach((a: any) => {
          ticketAssignments[a.ticketId] = a.themeId;
        });

        const formattedThemes = themes.map((t: any) => ({
          ...t,
          votes: 0,
          voterIds: []
        }));

        resolve({
          themes: formattedThemes,
          ticketAssignments
        });
      }
    });
  });
};

