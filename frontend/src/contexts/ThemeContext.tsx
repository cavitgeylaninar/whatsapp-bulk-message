import React, { createContext, useState, useContext, useEffect } from 'react';
import { ThemeProvider, PaletteMode } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { modernTheme, darkTheme } from '../theme/modernTheme';

interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const CustomThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode as PaletteMode) || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleColorMode = () => {
    // Add a small delay to prevent flashing
    document.body.style.transition = 'background-color 0.3s ease-in-out';
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = React.useMemo(
    () => {
      const selectedTheme = mode === 'light' ? modernTheme : darkTheme;
      return selectedTheme;
    },
    [mode]
  );

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};