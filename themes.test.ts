import { describe, it, expect } from 'vitest';
import { themes } from './themes';

describe('themes definitions', () => {
    it('should have at least the basic light and dark themes', () => {
        const ids = themes.map(t => t.id);
        expect(ids).toContain('light');
        expect(ids).toContain('dark');
    });

    it('should have all required colors for each theme', () => {
        themes.forEach(theme => {
            expect(theme.name).toBeDefined();
            expect(theme.colors.background).toMatch(/^#|rgba|var/);
            expect(theme.colors.surface).toBeDefined();
            expect(theme.colors.primary).toBeDefined();
            expect(theme.colors.text).toBeDefined();
            expect(theme.colors.border).toBeDefined();
            expect(theme.colors.ticketBackground).toBeDefined();
        });
    });

    it('should have unique IDs for all themes', () => {
        const ids = themes.map(t => t.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have Neo Brutalism theme with custom CSS', () => {
        const neo = themes.find(t => t.id === 'neo-brutalism');
        expect(neo).toBeDefined();
        expect(neo?.customCss).toContain('Neobrutalist Theme');
    });
});
