import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themes } from '../themes';

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (themeId: string) => void;
    sessionDefaultThemeId: string | null;
    setSessionDefaultThemeId: (themeId: string | null) => void;
    resetToDefault: () => void;
    isOverridden: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userThemeId, setUserThemeId] = useState<string | null>(null);
    const [sessionDefaultThemeId, setSessionDefaultThemeId] = useState<string | null>(null);

    useEffect(() => {
        const savedThemeId = localStorage.getItem('retro_theme_id');
        if (savedThemeId) {
            setUserThemeId(savedThemeId);
        }
    }, []);

    const setTheme = (themeId: string) => {
        setUserThemeId(themeId);
        localStorage.setItem('retro_theme_id', themeId);
    };

    const resetToDefault = () => {
        setUserThemeId(null);
        localStorage.removeItem('retro_theme_id');
    };

    // Calculate current theme based on priority: user override > session default > 'light'
    const activeThemeId = userThemeId || sessionDefaultThemeId || 'light';
    const currentTheme = themes.find(t => t.id === activeThemeId) || themes[0];

    const contextValue = {
        currentTheme,
        setTheme,
        sessionDefaultThemeId,
        setSessionDefaultThemeId,
        resetToDefault,
        isOverridden: !!userThemeId
    };

    useEffect(() => {
        const root = document.documentElement;
        const colors = currentTheme.colors;

        // Apply colors as CSS variables
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });

        // Add theme ID as data attribute for higher specificity styling without !important
        root.setAttribute('data-theme', currentTheme.id);

        // Apply background image if present
        if (currentTheme.backgroundImage) {
            document.body.style.backgroundImage = `url('${currentTheme.backgroundImage}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
            // Ensure the background color is also set, so it shows while image loads or if image has transparency
            document.body.style.backgroundColor = currentTheme.colors.background;
        } else {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = currentTheme.colors.background;
        }

        // Apply font family if present
        if (currentTheme.fontFamily) {
            document.body.style.fontFamily = currentTheme.fontFamily;
        } else {
            document.body.style.fontFamily = "'Inter', sans-serif";
        }

        // Apply custom CSS
        // Remove old custom style element if it exists
        const oldStyle = document.getElementById('theme-custom-css');
        if (oldStyle) {
            oldStyle.remove();
        }

        if (currentTheme.customCss) {
            const style = document.createElement('style');
            style.id = 'theme-custom-css';
            style.innerHTML = currentTheme.customCss;
            document.head.appendChild(style);
        }

    }, [currentTheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
