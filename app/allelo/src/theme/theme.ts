import { createTheme, alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

// Custom color palette with NAO green theme
const colors = {
  primary: {
    50: '#f0f5ed',
    100: '#dde8d5',
    200: '#c7d7bb',
    300: '#b1c6a0',
    400: '#9bb585',
    500: '#41682C', // Main brand color (dark green)
    600: '#395c26',
    700: '#315020',
    800: '#29441a',
    900: '#213814',
  },
  secondary: {
    50: '#f9fcf7',
    100: '#f3f8ef',
    200: '#edf4e7',
    300: '#e7f0df',
    400: '#e0ecd6',
    500: '#D9E7CB', // Accent color (light green)
    600: '#c4d4b3',
    700: '#afc19b',
    800: '#9aae83',
    900: '#859b6b',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  success: {
    50: '#e8f5e8',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20',
  },
  warning: {
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#ffc107',
    600: '#ffb300',
    700: '#ffa000',
    800: '#ff8f00',
    900: '#ff6f00',
  },
  error: {
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c',
  },
};

// Enhanced theme configuration
export const createAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.primary[500],
        light: colors.primary[300],
        dark: colors.primary[700],
        contrastText: '#ffffff',
      },
      secondary: {
        main: colors.secondary[500],
        light: colors.secondary[300],
        dark: colors.secondary[700],
        contrastText: '#ffffff',
      },
      success: {
        main: colors.success[500],
        light: colors.success[300],
        dark: colors.success[700],
      },
      warning: {
        main: colors.warning[500],
        light: colors.warning[300],
        dark: colors.warning[700],
      },
      error: {
        main: colors.error[500],
        light: colors.error[300],
        dark: colors.error[700],
      },
      background: {
        default: isDark ? '#0a1929' : '#fdfdf5',
        paper: isDark ? '#1e293b' : '#fdfdf5',
      },
      text: {
        primary: isDark ? '#e2e8f0' : '#3F4A34',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? alpha('#e2e8f0', 0.08) : alpha('#334155', 0.08),
      action: {
        hover: isDark ? alpha('#e2e8f0', 0.04) : alpha('#334155', 0.04),
        selected: isDark ? alpha('#e2e8f0', 0.08) : '#F7F3EA',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
        color: isDark ? '#e2e8f0' : '#3F4A34',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        color: isDark ? '#e2e8f0' : '#3F4A34',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
        color: isDark ? '#e2e8f0' : '#3F4A34',
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: '-0.005em',
        color: isDark ? '#e2e8f0' : '#3F4A34',
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: isDark ? '#e2e8f0' : '#3F4A34',
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
        color: isDark ? '#e2e8f0' : '#3F4A34',
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.5,
        color: isDark ? '#e2e8f0' : '#1B1C15',
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
        color: isDark ? '#e2e8f0' : '#1B1C15',
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.6,
        color: isDark ? '#e2e8f0' : '#1B1C15',
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.6,
        color: isDark ? '#e2e8f0' : '#1B1C15',
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
        textTransform: 'none' as const,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.5,
        color: isDark ? '#94a3b8' : '#1B1C15',
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.5,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
        color: isDark ? '#94a3b8' : '#1B1C15',
      },
    },
    spacing: 8,
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.06)',
      '0px 2px 4px rgba(0, 0, 0, 0.04), 0px 2px 3px rgba(0, 0, 0, 0.06)',
      '0px 3px 6px rgba(0, 0, 0, 0.04), 0px 3px 4px rgba(0, 0, 0, 0.06)',
      '0px 4px 8px rgba(0, 0, 0, 0.04), 0px 4px 6px rgba(0, 0, 0, 0.06)',
      '0px 6px 12px rgba(0, 0, 0, 0.04), 0px 6px 8px rgba(0, 0, 0, 0.06)',
      '0px 8px 16px rgba(0, 0, 0, 0.04), 0px 8px 12px rgba(0, 0, 0, 0.06)',
      '0px 12px 24px rgba(0, 0, 0, 0.04), 0px 12px 18px rgba(0, 0, 0, 0.06)',
      '0px 16px 32px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.06)',
      '0px 24px 48px rgba(0, 0, 0, 0.04), 0px 24px 36px rgba(0, 0, 0, 0.06)',
      '0px 32px 64px rgba(0, 0, 0, 0.04), 0px 32px 48px rgba(0, 0, 0, 0.06)',
      '0px 40px 80px rgba(0, 0, 0, 0.04), 0px 40px 60px rgba(0, 0, 0, 0.06)',
      '0px 48px 96px rgba(0, 0, 0, 0.04), 0px 48px 72px rgba(0, 0, 0, 0.06)',
      '0px 56px 112px rgba(0, 0, 0, 0.04), 0px 56px 84px rgba(0, 0, 0, 0.06)',
      '0px 64px 128px rgba(0, 0, 0, 0.04), 0px 64px 96px rgba(0, 0, 0, 0.06)',
      '0px 72px 144px rgba(0, 0, 0, 0.04), 0px 72px 108px rgba(0, 0, 0, 0.06)',
      '0px 80px 160px rgba(0, 0, 0, 0.04), 0px 80px 120px rgba(0, 0, 0, 0.06)',
      '0px 88px 176px rgba(0, 0, 0, 0.04), 0px 88px 132px rgba(0, 0, 0, 0.06)',
      '0px 96px 192px rgba(0, 0, 0, 0.04), 0px 96px 144px rgba(0, 0, 0, 0.06)',
      '0px 104px 208px rgba(0, 0, 0, 0.04), 0px 104px 156px rgba(0, 0, 0, 0.06)',
      '0px 112px 224px rgba(0, 0, 0, 0.04), 0px 112px 168px rgba(0, 0, 0, 0.06)',
      '0px 120px 240px rgba(0, 0, 0, 0.04), 0px 120px 180px rgba(0, 0, 0, 0.06)',
      '0px 128px 256px rgba(0, 0, 0, 0.04), 0px 128px 192px rgba(0, 0, 0, 0.06)',
      '0px 136px 272px rgba(0, 0, 0, 0.04), 0px 136px 204px rgba(0, 0, 0, 0.06)',
      '0px 144px 288px rgba(0, 0, 0, 0.04), 0px 144px 216px rgba(0, 0, 0, 0.06)',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          '*': {
            boxSizing: 'border-box',
          },
          html: {
            MozOsxFontSmoothing: 'grayscale',
            WebkitFontSmoothing: 'antialiased',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%',
            width: '100%',
          },
          body: {
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            minHeight: '100%',
            width: '100%',
          },
          '#root': {
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.5,
            textTransform: 'none',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
            '&:active': {
              boxShadow: 'none',
            },
          },
          contained: {
            '&:hover': {
              boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08), 0px 2px 3px rgba(0, 0, 0, 0.12)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? '#1e293b' : '#F7F3EA',
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.06)',
            border: `1px solid ${isDark ? alpha('#e2e8f0', 0.08) : '#74796D24'}`,
            '&:hover': {
              boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08), 0px 4px 6px rgba(0, 0, 0, 0.12)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundColor: isDark ? '#1e293b' : '#F7F3EA',
            border: `1px solid ${isDark ? alpha('#e2e8f0', 0.08) : '#74796D24'}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: isDark ? alpha('#e2e8f0', 0.02) : '#F7F3EA',
              border: `1px solid ${isDark ? alpha('#e2e8f0', 0.12) : '#74796D24'}`,
              '&:hover': {
                backgroundColor: isDark ? alpha('#e2e8f0', 0.04) : '#F7F3EA',
                borderColor: isDark ? alpha('#e2e8f0', 0.16) : '#74796D24',
              },
              '&.Mui-focused': {
                backgroundColor: isDark ? alpha('#e2e8f0', 0.04) : '#F7F3EA',
                borderColor: isDark ? alpha('#e2e8f0', 0.2) : '#41682C',
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e293b' : '#fdfdf5',
            color: isDark ? '#e2e8f0' : '#3F4A34',
            boxShadow: 'none !important',
            borderRadius: '0 !important',
            border: 'none',
            height: 64,
            minHeight: 64,
            '&::before': {
              borderRadius: '0 !important',
            },
            '&::after': {
              borderRadius: '0 !important',
            },
            '& > *': {
              borderRadius: '0 !important',
            },
            '&.MuiPaper-elevation': {
              boxShadow: 'none !important',
            },
            '&.MuiPaper-elevation4': {
              boxShadow: 'none !important',
            },
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: '64px !important',
            height: '64px !important',
            paddingTop: '0 !important',
            paddingBottom: '0 !important',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#0f172a' : '#fdfdf5',
            borderRadius: 0,
            border: 'none',
            borderRight: 'none !important',
          },
          docked: {
            '& .MuiDrawer-paper': {
              border: 'none',
              borderRight: 'none',
            },
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            margin: 0,
            '&:hover': {
              backgroundColor: isDark ? alpha('#e2e8f0', 0.04) : alpha('#334155', 0.04),
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha('#41682C', 0.12) : '#F7F3EA',
              '&:hover': {
                backgroundColor: isDark ? alpha('#41682C', 0.16) : '#F7F3EA',
              },
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            borderRadius: 2,
            height: 3,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 48,
            '&.Mui-selected': {
              fontWeight: 600,
            },
          },
        },
      },
    },
  });
};

export default createAppTheme;