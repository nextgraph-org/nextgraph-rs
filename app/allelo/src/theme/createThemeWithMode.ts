import { createTheme } from '@mui/material/styles';
import { createAppTheme } from './theme';
import { createWireframeTheme } from './wireframeTheme';

export type ThemeMode = 'normal' | 'wireframe';

// CSS custom properties that can be overridden by custom themes
export const themeVars = {
  // Colors
  '--theme-primary': 'var(--primary-main)',
  '--theme-primary-light': 'var(--primary-light)',
  '--theme-primary-dark': 'var(--primary-dark)',
  '--theme-secondary': 'var(--secondary-main)',
  '--theme-secondary-light': 'var(--secondary-light)',
  '--theme-secondary-dark': 'var(--secondary-dark)',
  
  // Backgrounds
  '--theme-bg-default': 'var(--bg-default)',
  '--theme-bg-paper': 'var(--bg-paper)',
  '--theme-bg-sidebar': 'var(--bg-sidebar)',
  '--theme-bg-navbar': 'var(--bg-navbar)',
  
  // Text
  '--theme-text-primary': 'var(--text-primary)',
  '--theme-text-secondary': 'var(--text-secondary)',
  
  // Borders
  '--theme-border': 'var(--border-main)',
  '--theme-divider': 'var(--divider)',
  
  // Other
  '--theme-radius': 'var(--border-radius)',
  '--theme-shadow': 'var(--box-shadow)',
};

export const createThemeWithMode = (mode: ThemeMode = 'normal') => {
  const baseTheme = mode === 'wireframe' 
    ? createWireframeTheme() 
    : createAppTheme('light');

  // Inject CSS variables based on theme
  const cssVariables = mode === 'wireframe' ? {
    '--primary-main': '#000000',
    '--primary-light': '#404040',
    '--primary-dark': '#000000',
    '--secondary-main': '#666666',
    '--secondary-light': '#999999',
    '--secondary-dark': '#333333',
    '--bg-default': '#FFFFFF',
    '--bg-paper': '#FFFFFF',
    '--bg-sidebar': 'transparent',
    '--bg-navbar': 'transparent',
    '--text-primary': '#000000',
    '--text-secondary': '#666666',
    '--border-main': '#000000',
    '--divider': '#000000',
    '--border-radius': '0px',
    '--box-shadow': 'none',
  } : {
    '--primary-main': '#41682C',
    '--primary-light': '#9bb585',
    '--primary-dark': '#29441a',
    '--secondary-main': '#D9E7CB',
    '--secondary-light': '#e7f0df',
    '--secondary-dark': '#afc19b',
    '--bg-default': '#fdfdf5',
    '--bg-paper': '#F7F3EA',
    '--bg-sidebar': '#fdfdf5',
    '--bg-navbar': '#fdfdf5',
    '--text-primary': '#3F4A34',
    '--text-secondary': '#64748b',
    '--border-main': '#74796D24',
    '--divider': 'rgba(51, 65, 85, 0.08)',
    '--border-radius': '12px',
    '--box-shadow': '0px 1px 3px rgba(0, 0, 0, 0.04)',
  };

  // Override the theme to use CSS variables
  return createTheme({
    ...baseTheme,
    components: {
      ...baseTheme.components,
      MuiCssBaseline: {
        styleOverrides: {
          ':root': cssVariables,
          body: {
            backgroundColor: 'var(--bg-default)',
            color: 'var(--text-primary)',
          },
          '*': {
            transition: 'background-color 0.2s ease, color 0.2s ease, border 0.2s ease',
          },
        },
      },
      MuiAppBar: {
        ...baseTheme.components?.MuiAppBar,
        styleOverrides: {
          root: {
            backgroundColor: 'var(--bg-navbar)',
            color: 'var(--text-primary)',
            borderBottom: `1px solid var(--divider)`,
          },
        },
      },
      MuiDrawer: {
        ...baseTheme.components?.MuiDrawer,
        styleOverrides: {
          paper: {
            backgroundColor: 'var(--bg-sidebar)',
            borderRight: `1px solid var(--divider)`,
          },
        },
      },
      MuiPaper: {
        ...baseTheme.components?.MuiPaper,
        styleOverrides: {
          root: {
            backgroundColor: 'var(--bg-paper)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--box-shadow)',
          },
        },
      },
      MuiCard: {
        ...baseTheme.components?.MuiCard,
        styleOverrides: {
          root: {
            backgroundColor: 'var(--bg-paper)',
            borderRadius: 'var(--border-radius)',
            boxShadow: 'var(--box-shadow)',
          },
        },
      },
      MuiButton: {
        ...baseTheme.components?.MuiButton,
        styleOverrides: {
          root: {
            borderRadius: 'var(--border-radius)',
          },
          contained: {
            backgroundColor: 'var(--primary-main)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'var(--primary-dark)',
            },
          },
        },
      },
    },
  });
};

export default createThemeWithMode;