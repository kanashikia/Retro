import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themes } from '../themes';

interface ThemeContextType {
    currentTheme: Theme;
    setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState<Theme>(themes[0]);

    useEffect(() => {
        const savedThemeId = localStorage.getItem('retro_theme_id');
        if (savedThemeId) {
            const foundTheme = themes.find(t => t.id === savedThemeId);
            if (foundTheme) {
                setCurrentTheme(foundTheme);
            }
        }
    }, []);

    const setTheme = (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        if (theme) {
            setCurrentTheme(theme);
            localStorage.setItem('retro_theme_id', themeId);
        }
    };

    useEffect(() => {
        const root = document.documentElement;
        const colors = currentTheme.colors;

        // Apply colors as CSS variables
        Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
        });

        // Apply background image if present
        if (currentTheme.backgroundImage) {
            document.body.style.backgroundImage = `url('${currentTheme.backgroundImage}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
        } else {
            document.body.style.backgroundImage = 'none';
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
        <ThemeContext.Provider value={{ currentTheme, setTheme }}>
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
