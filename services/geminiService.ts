
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, ThemeGroup } from "../types";

export const groupTicketsWithAI = async (tickets: Ticket[]): Promise<{ themes: ThemeGroup[], ticketAssignments: Record<string, string> }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const ticketData = tickets.map(t => ({ 
    id: t.id, 
    text: t.text, 
    originalContext: t.column 
  }));
  
  const prompt = `Act as an expert Agile Coach. Your task is to organize team feedback into semantic themes based on their SUBJECT MATTER.

CRITICAL INSTRUCTIONS:
1. IGNORE the original column names ("What went well", etc.) as the primary grouping mechanism. 
2. Group tickets that discuss the SAME TOPIC (e.g., "Communication", "Technical Debt", "Testing", "Process") into the same theme, regardless of whether they were positive feedback or puzzles.
3. The "originalContext" field is only for context (e.g., to distinguish between "Slow deployments" and "Fast deployments" which both belong to "Deployment Theme").
4. Create 3 to 6 distinct, logical themes.
5. Each theme should have a short, professional name and a brief description explaining why these items are grouped together.
6. Assign every ticket ID to exactly one theme ID.

Feedback Items:
${JSON.stringify(ticketData)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["id", "name", "description"]
              }
            },
            assignments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  ticketId: { type: Type.STRING },
                  themeId: { type: Type.STRING }
                },
                required: ["ticketId", "themeId"]
              }
            }
          },
          required: ["themes", "assignments"]
        }
      },
    });

    const text = response.text || "";
    const jsonStr = text.replace(/```json\n?|```/g, "").trim();
    const result = JSON.parse(jsonStr);
    
    const ticketAssignments: Record<string, string> = {};
    if (result.assignments && Array.isArray(result.assignments)) {
      result.assignments.forEach((a: any) => {
        ticketAssignments[a.ticketId] = a.themeId;
      });
    }

    const themes = (result.themes || []).map((t: any) => ({
      ...t,
      votes: 0,
      voterIds: []
    }));

    return {
      themes,
      ticketAssignments
    };
  } catch (error) {
    console.error("AI Grouping failed:", error);
    return {
      themes: [{ id: 'misc', name: 'General Topics', description: 'Consolidated team feedback for review', votes: 0, voterIds: [] }],
      ticketAssignments: tickets.reduce((acc, t) => ({ ...acc, [t.id]: 'misc' }), {})
    };
  }
};
