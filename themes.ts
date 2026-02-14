export interface ThemeColors {
    background: string;
    surface: string;
    primary: string;
    primaryHover: string;
    secondary: string;
    text: string;
    textMuted: string;
    border: string;
    ticketBackground: string;
}

export interface Theme {
    id: string;
    name: string;
    colors: ThemeColors;
    backgroundImage?: string;
    fontFamily?: string;
    customCss?: string;
}

export const themes: Theme[] = [
    {
        id: 'light',
        name: 'Default Light',
        colors: {
            background: '#f8fafc', // slate-50
            surface: '#ffffff', // white
            primary: '#4f46e5', // indigo-600
            primaryHover: '#4338ca', // indigo-700
            secondary: '#e2e8f0', // slate-200
            text: '#0f172a', // slate-900
            textMuted: '#64748b', // slate-500
            border: '#e2e8f0', // slate-200
            ticketBackground: '#ffffff',
        },
    },
    {
        id: 'dark',
        name: 'Dark Mode',
        colors: {
            background: '#0f172a', // slate-900
            surface: '#1e293b', // slate-800
            primary: '#6366f1', // indigo-500
            primaryHover: '#4f46e5', // indigo-600
            secondary: '#334155', // slate-700
            text: '#f8fafc', // slate-50
            textMuted: '#94a3b8', // slate-400
            border: '#334155', // slate-700
            ticketBackground: '#1e293b',
        },
    },
    {
        id: 'warcraft',
        name: 'Warcraft (Orc)',
        backgroundImage: 'https://www.startpage.com/av/proxy-image?piurl=https%3A%2F%2Fi.ytimg.com%2Fvi%2FQ2zfx5hQ3CE%2Fmaxresdefault.jpg&sp=1771073899T577f2d7101e6d0c883e6acde61e2c007094f52458d4429040184954269d79f48', // Placeholder parchment texture
        fontFamily: '"Cinzel", serif',
        customCss: `
      .border-2 { border-width: 3px; border-style: ridge; }
      button { text-transform: uppercase; letter-spacing: 0.05em; }
    `,
        colors: {
            background: '#2a1a0a', // Dark brown
            surface: '#3e2c1c', // Lighter brown/leather
            primary: '#b91c1c', // Red (Orcish)
            primaryHover: '#991b1b',
            secondary: '#78350f', // Wood/Bronze
            text: '#fcd34d', // Gold
            textMuted: '#d4d4d8', // Light Gray
            border: '#b45309', // Bronze/Orange
            ticketBackground: '#583818',
        },
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        backgroundImage: 'https://img.freepik.com/free-vector/dark-gradient-background-with-copy-space_53876-99548.jpg', // Abstract dark grid/gradient
        fontFamily: '"Orbitron", sans-serif',
        customCss: `
      * { text-shadow: 0 0 2px rgba(0, 255, 255, 0.5); }
      .shadow-sm, .shadow-md { box-shadow: 0 0 10px var(--color-primary); }
    `,
        colors: {
            background: '#050505', // Almost black
            surface: '#121212',
            primary: '#00ffcc', // Cyan neon
            primaryHover: '#00ccaa',
            secondary: '#222222',
            text: '#ff00ff', // Magenta neon
            textMuted: '#00aaaa',
            border: '#00ffcc',
            ticketBackground: '#0a0a0a',
        },
    },
];
