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
        id: 'orcish-horde',
        name: 'Orcish Horde',
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
    {
        id: 'midgar-night',
        name: 'Midgar Night',
        backgroundImage: 'https://www.startpage.com/av/proxy-image?piurl=https%3A%2F%2Fcdn.wccftech.com%2Fwp-content%2Fuploads%2F2024%2F02%2Ffinal-fantasy-vii-rebirth-HD-scaled.jpg&sp=1771079036Tcbb5c5adee46708cdfbbb10c4f2ae729609f54b1acbd06fc4f7591298b729260', // Midgar/Buster Sword vibe
        fontFamily: '"Orbitron", sans-serif',
        customCss: `
            .bg-surface, .bg-secondary, .group\\/item:hover {
                background: linear-gradient(180deg, #000050 0%, #000020 100%) !important;
                border: 2px solid #909090 !important;
                border-radius: 4px !important;
                box-shadow: 0 0 0 1px #505050, inset 0 0 10px rgba(0,0,0,0.5) !important;
            }
            button.bg-primary {
                background: linear-gradient(180deg, #008080 0%, #004040 100%) !important;
                border: 1px solid #a0f0f0 !important;
                box-shadow: 0 0 5px #00ffc0 !important;
            }
            .text-text { color: #e0e0e0 !important; text-shadow: 1px 1px 0 #000; }
        `,
        colors: {
            background: '#050510',
            surface: '#000030', // Classic Menu Blue
            primary: '#00fa9a', // Mako Green
            primaryHover: '#00d080',
            secondary: '#101030',
            text: '#ffffff',
            textMuted: '#a0a0b0',
            border: '#707070',
            ticketBackground: '#000040',
        },
    },
    {
        id: 'neo-brutalism',
        name: 'Neo Brutalism',
        fontFamily: '"Public Sans", "Inter", sans-serif',
        customCss: `
            /* Neobrutalist Theme - Scoped Styling */
            
            [data-theme="neo-brutalism"] .bg-surface, 
            [data-theme="neo-brutalism"] .bg-ticket-bg, 
            [data-theme="neo-brutalism"] .bg-secondary, 
            [data-theme="neo-brutalism"] .card, 
            [data-theme="neo-brutalism"] [class*="rounded-"], 
            [data-theme="neo-brutalism"] button {
                border: 2px solid #000;
                box-shadow: 4px 4px 0px 0px #000;
                border-radius: 4px;
            }
            
            [data-theme="neo-brutalism"] h1, 
            [data-theme="neo-brutalism"] h2, 
            [data-theme="neo-brutalism"] h3, 
            [data-theme="neo-brutalism"] .font-bold, 
            [data-theme="neo-brutalism"] .font-black {
                color: #000;
                text-transform: uppercase;
                letter-spacing: 0.02em;
            }
            
            [data-theme="neo-brutalism"] p, 
            [data-theme="neo-brutalism"] span, 
            [data-theme="neo-brutalism"] div:not([class*="bg-"]) {
                color: var(--color-text);
            }

            [data-theme="neo-brutalism"] .text-text-muted {
                color: #000;
                opacity: 0.8;
                font-weight: 500;
            }
            
            [data-theme="neo-brutalism"] button {
                box-shadow: 2px 2px 0px 0px #000;
                transform: translate(0, 0);
                transition: all 0.1s ease;
                font-weight: 800;
                text-transform: uppercase;
                background-color: var(--color-primary);
                color: #000;
                border: 2px solid #000;
            }
            
            [data-theme="neo-brutalism"] button:active {
                box-shadow: 0px 0px 0px 0px #000;
                transform: translate(2px, 2px);
            }
            
            [data-theme="neo-brutalism"] input, 
            [data-theme="neo-brutalism"] select, 
            [data-theme="neo-brutalism"] textarea {
                border: 2px solid #000;
                border-radius: 2px;
                box-shadow: 2px 2px 0px 0px #000;
                background-color: #fff;
                color: #000;
                padding: 8px 12px;
            }
            
            [data-theme="neo-brutalism"] .border-b-4, 
            [data-theme="neo-brutalism"] .border-2, 
            [data-theme="neo-brutalism"] .border {
                border-color: #000;
                border-width: 2px;
            }

            /* Restore Column Color Context with Pseudo-elements */
            [data-theme="neo-brutalism"] .border-emerald-500, 
            [data-theme="neo-brutalism"] .border-rose-500, 
            [data-theme="neo-brutalism"] .border-sky-500, 
            [data-theme="neo-brutalism"] .border-amber-500 {
                position: relative;
                overflow: hidden;
            }
            
            [data-theme="neo-brutalism"] .border-emerald-500::before, 
            [data-theme="neo-brutalism"] .border-rose-500::before, 
            [data-theme="neo-brutalism"] .border-sky-500::before, 
            [data-theme="neo-brutalism"] .border-amber-500::before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 8px;
                z-index: 10;
            }

            [data-theme="neo-brutalism"] .border-emerald-500::before { background-color: #10b981; }
            [data-theme="neo-brutalism"] .border-rose-500::before { background-color: #f43f5e; }
            [data-theme="neo-brutalism"] .border-sky-500::before { background-color: #0ea5e9; }
            [data-theme="neo-brutalism"] .border-amber-500::before { background-color: #f59e0b; }

            /* PhaseStepper Fixes */
            [data-theme="neo-brutalism"] nav.bg-surface\\/80 {
                background-color: var(--color-surface);
                backdrop-filter: none;
                border-bottom: 2px solid #000;
            }

            [data-theme="neo-brutalism"] nav.bg-surface\\/80 button {
                padding-left: 20px;
                padding-right: 20px;
                margin: 0 -10px; /* Offset some of the padding for the active line */
            }

            [data-theme="neo-brutalism"] .bg-primary\\/10 {
                background-color: var(--color-primary);
                color: #000;
                border: 2px solid #000;
            }

            [data-theme="neo-brutalism"] .bg-secondary\\/50 {
                background-color: var(--color-secondary);
                color: #000;
                border: 2px solid #000;
            }

            [data-theme="neo-brutalism"] .text-primary {
                color: #000;
                text-decoration: underline;
                text-decoration-thickness: 2px;
            }
            
            [data-theme="neo-brutalism"] .bg-emerald-100, 
            [data-theme="neo-brutalism"] .bg-emerald-50, 
            [data-theme="neo-brutalism"] .bg-rose-50, 
            [data-theme="neo-brutalism"] .bg-sky-50, 
            [data-theme="neo-brutalism"] .bg-amber-50 {
                border: 2px solid #000;
            }
            
            [data-theme="neo-brutalism"] main {
                padding: 16px;
            }

            [data-theme="neo-brutalism"] .group\\/item {
                margin-bottom: 8px;
            }

            [data-theme="neo-brutalism"] .shadow-sm, 
            [data-theme="neo-brutalism"] .shadow-md, 
            [data-theme="neo-brutalism"] .shadow-xl {
                box-shadow: 4px 4px 0px 0px #000;
            }

            /* Responsive Mobile Adjustments */
            @media (max-width: 768px) {
                [data-theme="neo-brutalism"] .bg-surface, 
                [data-theme="neo-brutalism"] .bg-ticket-bg, 
                [data-theme="neo-brutalism"] .bg-secondary, 
                [data-theme="neo-brutalism"] .card, 
                [data-theme="neo-brutalism"] [class*="rounded-"], 
                [data-theme="neo-brutalism"] button {
                    box-shadow: 2px 2px 0px 0px #000;
                }
                [data-theme="neo-brutalism"] button:active {
                    transform: translate(1px, 1px);
                    box-shadow: 0px 0px 0px 0px #000;
                }
                [data-theme="neo-brutalism"] .shadow-sm, 
                [data-theme="neo-brutalism"] .shadow-md, 
                [data-theme="neo-brutalism"] .shadow-xl {
                    box-shadow: 2px 2px 0px 0px #000;
                }
                [data-theme="neo-brutalism"] main {
                    padding: 0 8px;
                }
            }
        `,
        colors: {
            background: '#f9df6d', // Bright yellow
            surface: '#ffffff',
            primary: '#00e1ff', // Cyan
            primaryHover: '#00cce6',
            secondary: '#ff90e8', // Pink
            text: '#000000',
            textMuted: '#000000',
            border: '#000000',
            ticketBackground: '#ffffff',
        },
    },
];
