import { createTheme, alpha } from '@mui/material/styles';
import type { PaletteMode } from '@mui/material';

// Custom color palette from Figma design
const colors = {
  primary: {
    50: '#f0f3ff',
    100: '#e0e6ff',
    200: '#c6d2ff',
    300: '#a8b9ff',
    400: '#8a9eff',
    500: '#546DF9', // Main brand color (primary gradient start)
    600: '#4c5fe0',
    700: '#4351c7',
    800: '#3b43ae',
    900: '#333595',
    gradient: 'linear-gradient(90deg, #546DF9 0%, #E34E89 50%, #EE8823 99.52%)',
    gradientAlt: 'linear-gradient(92.8deg, #4C6FFF 3.54%, #E6498D 54.82%, #F19C00 109.38%)',
    badge: '#5435D9',
    badgeBg: '#DCD5FF',
  },
  secondary: {
    50: '#fef0f9',
    100: '#fde1f3',
    200: '#fbc3e7',
    300: '#f8a5db',
    400: '#f587cf',
    500: '#E34E89', // Accent color (primary gradient middle)
    600: '#cc467b',
    700: '#b53e6d',
    800: '#9e365f',
    900: '#872e51',
  },
  neutral: {
    0: '#FFFFFF',
    5: '#F8FAFB',
    10: '#F5F7F8',
    20: '#F5F7F9',
    25: '#F9F8FD',
    30: '#D8DFE3',
    40: '#DFE4EC',
    45: '#E6E9EB',
    50: '#94A0A7',
    60: '#727272',
    70: '#3A474F',
    80: '#495965',
    90: '#616161',
    100: '#1F2C34', // Primary text
    110: '#141414',
  },
  success: {
    50: '#e6f9f0',
    100: '#ccf3e1',
    200: '#99e7c3',
    300: '#66dba5',
    400: '#56E8A7', // Success bright (from Figma)
    500: '#09C26F',
    600: '#0D7744',
    700: '#007A7B',
    800: '#005a5b',
    900: '#003d3e',
  },
  warning: {
    50: '#fff8e5',
    100: '#fff1cc',
    200: '#ffe399',
    300: '#ffd666',
    400: '#ffc833',
    500: '#FFAB00',
    600: '#ee8823', // Tertiary gradient color
    700: '#ed7c37',
    800: '#f18636',
    900: '#c70a9b',
  },
  error: {
    50: '#ffe8e8',
    100: '#ffd1d1',
    200: '#ffa3a3',
    300: '#ff7575',
    400: '#ff4747',
    500: '#D90034',
    600: '#B3261E',
    700: '#95162A', // Alert foreground
    800: '#771c21',
    900: '#5a151a',
  },
  accent: {
    lavender: '#7876E0',
    purple: '#46359D',
    violet: '#6852D6',
    blue: '#3C60F4',
    cyan: '#00C0CC', // Focus bright
    gray: '#C4C4C4',
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
        default: isDark ? '#0a1929' : colors.neutral[10],
        paper: isDark ? '#1e293b' : colors.neutral[0],
      },
      text: {
        primary: isDark ? '#e2e8f0' : colors.neutral[100],
        secondary: isDark ? '#94a3b8' : colors.neutral[70],
      },
      divider: isDark ? alpha('#e2e8f0', 0.08) : alpha('#334155', 0.08),
      action: {
        hover: isDark ? alpha('#e2e8f0', 0.04) : alpha('#334155', 0.04),
        selected: isDark ? alpha('#e2e8f0', 0.08) : '#F7F3EA',
      },
    },
    typography: {
      fontFamily: 'var(--mui-typography-fontFamily)',
      h1: {
        fontSize: 'var(--mui-typography-h1-fontSize)',
        fontWeight: 'var(--mui-typography-h1-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-h1-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-h1-letterSpacing)',
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      h2: {
        fontSize: 'var(--mui-typography-h2-fontSize)',
        fontWeight: 'var(--mui-typography-h2-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-h2-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-h2-letterSpacing)',
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      h3: {
        fontSize: 'var(--mui-typography-h3-fontSize)',
        fontWeight: 'var(--mui-typography-h3-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-h3-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-h3-letterSpacing)',
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      h4: {
        fontSize: 'var(--mui-typography-h4-fontSize)',
        fontWeight: 'var(--mui-typography-h4-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-h4-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-h4-letterSpacing)',
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      h5: {
        fontSize: 'var(--mui-typography-h5-fontSize)',
        fontWeight: 'var(--mui-typography-h5-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-h5-lineHeight)' as any,
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      h6: {
        fontSize: 'var(--mui-typography-h6-fontSize)',
        fontWeight: 'var(--mui-typography-h6-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-h6-lineHeight)' as any,
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      subtitle1: {
        fontSize: 'var(--mui-typography-subtitle1-fontSize)',
        fontWeight: 'var(--mui-typography-subtitle1-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-subtitle1-lineHeight)' as any,
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      subtitle2: {
        fontSize: 'var(--mui-typography-subtitle2-fontSize)',
        fontWeight: 'var(--mui-typography-subtitle2-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-subtitle2-lineHeight)' as any,
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      body1: {
        fontSize: 'var(--mui-typography-body1-fontSize)',
        fontWeight: 'var(--mui-typography-body1-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-body1-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-body1-letterSpacing)',
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      body2: {
        fontSize: 'var(--mui-typography-body2-fontSize)',
        fontWeight: 'var(--mui-typography-body2-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-body2-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-body2-letterSpacing)',
        color: isDark ? '#e2e8f0' : colors.neutral[100],
      },
      button: {
        fontSize: 'var(--mui-typography-button-fontSize)',
        fontWeight: 'var(--mui-typography-button-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-button-lineHeight)' as any,
        textTransform: 'var(--mui-typography-button-textTransform)' as any,
      },
      caption: {
        fontSize: 'var(--mui-typography-caption-fontSize)',
        fontWeight: 'var(--mui-typography-caption-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-caption-lineHeight)' as any,
        letterSpacing: 'var(--mui-typography-caption-letterSpacing)',
        color: isDark ? '#94a3b8' : colors.neutral[70],
      },
      overline: {
        fontSize: 'var(--mui-typography-overline-fontSize)',
        fontWeight: 'var(--mui-typography-overline-fontWeight)' as any,
        lineHeight: 'var(--mui-typography-overline-lineHeight)' as any,
        textTransform: 'var(--mui-typography-overline-textTransform)' as any,
        letterSpacing: 'var(--mui-typography-overline-letterSpacing)',
        color: isDark ? '#94a3b8' : colors.neutral[100],
      },
    },
    spacing: 8,
    shadows: [
      'none',
      '0px 1px 2px rgba(0, 0, 0, 0.06)',
      '0px 2px 4px rgba(0, 0, 0, 0.08)',
      '0px 3px 6px rgba(0, 0, 0, 0.1)',
      '0px 4px 8px rgba(49, 47, 57, 0.25)', // From Figma
      '0px 6px 12px rgba(0, 0, 0, 0.12)',
      '0px 8px 16px rgba(54, 105, 138, 0.1)', // From Figma (float/level 2)
      '0px 12px 24px rgba(0, 0, 0, 0.12)',
      '0px 16px 32px rgba(0, 0, 0, 0.14)',
      '0px 24px 48px rgba(0, 0, 0, 0.16)',
      '0px 32px 64px rgba(0, 0, 0, 0.18)',
      '0px 40px 80px rgba(0, 0, 0, 0.2)',
      '0px 48px 96px rgba(0, 0, 0, 0.22)',
      '0px 56px 112px rgba(0, 0, 0, 0.24)',
      '0px 64px 128px rgba(0, 0, 0, 0.26)',
      '0px 72px 144px rgba(0, 0, 0, 0.28)',
      '0px 80px 160px rgba(0, 0, 0, 0.3)',
      '0px 88px 176px rgba(0, 0, 0, 0.32)',
      '0px 96px 192px rgba(0, 0, 0, 0.34)',
      '0px 104px 208px rgba(0, 0, 0, 0.36)',
      '0px 112px 224px rgba(0, 0, 0, 0.38)',
      '0px 120px 240px rgba(0, 0, 0, 0.4)',
      '0px 128px 256px rgba(0, 0, 0, 0.42)',
      '0px 136px 272px rgba(0, 0, 0, 0.44)',
      '0px 144px 288px rgba(0, 0, 0, 0.46)',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            // Typography CSS variables
            '--mui-typography-fontFamily': '"Montserrat", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',

            '--mui-typography-h1-fontSize': '2.5rem',
            '--mui-typography-h1-fontWeight': '700',
            '--mui-typography-h1-lineHeight': '1.2',
            '--mui-typography-h1-letterSpacing': '-0.02em',

            '--mui-typography-h2-fontSize': '2rem',
            '--mui-typography-h2-fontWeight': '600',
            '--mui-typography-h2-lineHeight': '1.3',
            '--mui-typography-h2-letterSpacing': '-0.015em',

            '--mui-typography-h3-fontSize': '1.75rem',
            '--mui-typography-h3-fontWeight': '600',
            '--mui-typography-h3-lineHeight': '1.3',
            '--mui-typography-h3-letterSpacing': '-0.015em',

            '--mui-typography-h4-fontSize': '1.5rem',
            '--mui-typography-h4-fontWeight': '600',
            '--mui-typography-h4-lineHeight': '1.33',
            '--mui-typography-h4-letterSpacing': '-0.015em',

            '--mui-typography-h5-fontSize': '1.25rem',
            '--mui-typography-h5-fontWeight': '600',
            '--mui-typography-h5-lineHeight': '1.4',

            '--mui-typography-h6-fontSize': '1.125rem',
            '--mui-typography-h6-fontWeight': '600',
            '--mui-typography-h6-lineHeight': '1.4',

            '--mui-typography-subtitle1-fontSize': '1rem',
            '--mui-typography-subtitle1-fontWeight': '500',
            '--mui-typography-subtitle1-lineHeight': '1.5',

            '--mui-typography-subtitle2-fontSize': '0.875rem',
            '--mui-typography-subtitle2-fontWeight': '500',
            '--mui-typography-subtitle2-lineHeight': '1.5',

            '--mui-typography-body1-fontSize': '1rem',
            '--mui-typography-body1-fontWeight': '400',
            '--mui-typography-body1-lineHeight': '1.38',
            '--mui-typography-body1-letterSpacing': '-0.015em',

            '--mui-typography-body2-fontSize': '0.875rem',
            '--mui-typography-body2-fontWeight': '400',
            '--mui-typography-body2-lineHeight': '1.43',
            '--mui-typography-body2-letterSpacing': '-0.01em',

            '--mui-typography-button-fontSize': '0.875rem',
            '--mui-typography-button-fontWeight': '500',
            '--mui-typography-button-lineHeight': '1.5',
            '--mui-typography-button-textTransform': 'none',

            '--mui-typography-caption-fontSize': '0.75rem',
            '--mui-typography-caption-fontWeight': '400',
            '--mui-typography-caption-lineHeight': '1.5',
            '--mui-typography-caption-letterSpacing': '-0.01em',

            '--mui-typography-overline-fontSize': '0.625rem',
            '--mui-typography-overline-fontWeight': '600',
            '--mui-typography-overline-lineHeight': '1.8',
            '--mui-typography-overline-textTransform': 'uppercase',
            '--mui-typography-overline-letterSpacing': '0.05em',

            // Component-specific CSS variables
            '--button-border-radius': '48px',
            '--button-padding': '12px 16px',
            '--button-font-weight': '500',
            '--button-font-size': '1rem',
            '--button-line-height': '1.43',
            '--button-letter-spacing': '-0.01em',
            '--button-hover-shadow': '0px 2px 4px rgba(0, 0, 0, 0.08)',

            '--card-border-radius': '20px',
            '--card-shadow': '0px 4px 16px rgba(54, 105, 138, 0.1)',
            '--card-hover-shadow': '0px 4px 8px rgba(49, 47, 57, 0.25)',

            '--paper-border-radius': '30px',

            '--textfield-border-radius': '48px',

            '--appbar-height': '64px',
            '--toolbar-height': '64px',

            '--list-item-border-radius': '0px',

            '--tab-indicator-height': '3px',
            '--tab-indicator-border-radius': '2px',
            '--tab-min-height': '48px',
            '--tab-font-size': '0.875rem',
            '--tab-font-weight': '500',
            '--tab-selected-font-weight': '600',
          },
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
            borderRadius: 'var(--button-border-radius)',
            padding: 'var(--button-padding)',
            fontWeight: 'var(--button-font-weight)',
            fontSize: 'var(--button-font-size)',
            lineHeight: 'var(--button-line-height)',
            letterSpacing: 'var(--button-letter-spacing)',
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
              boxShadow: 'var(--button-hover-shadow)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--card-border-radius)',
            backgroundColor: isDark ? '#1e293b' : colors.neutral[0],
            boxShadow: 'var(--card-shadow)',
            border: `1px solid ${isDark ? alpha('#e2e8f0', 0.08) : colors.neutral[30]}`,
            '&:hover': {
              boxShadow: 'var(--card-hover-shadow)',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 'var(--paper-border-radius) !important',
            backgroundColor: isDark ? '#1e293b' : colors.neutral[0],
            border: `1px solid ${isDark ? alpha('#e2e8f0', 0.08) : colors.neutral[30]}`,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          minRows: 3,
        },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 'var(--textfield-border-radius)',
              backgroundColor: isDark ? alpha('#e2e8f0', 0.02) : colors.neutral[5],
              border: `1px solid ${isDark ? alpha('#e2e8f0', 0.12) : colors.neutral[30]}`,
              '&:hover': {
                backgroundColor: isDark ? alpha('#e2e8f0', 0.04) : colors.neutral[5],
                borderColor: isDark ? alpha('#e2e8f0', 0.16) : colors.neutral[30],
              },
              '&.Mui-focused': {
                backgroundColor: isDark ? alpha('#e2e8f0', 0.04) : colors.neutral[5],
                borderColor: isDark ? alpha('#e2e8f0', 0.2) : colors.accent.cyan,
              },
              // Multiline (textarea) specific styles
              '&.MuiInputBase-multiline': {
                borderRadius: '12px', // Sharper corners for textareas
                padding: '12px 14px',
              },
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e293b' : colors.neutral[0],
            color: isDark ? '#e2e8f0' : colors.neutral[100],
            boxShadow: 'none !important',
            borderRadius: '0 !important',
            border: 'none',
            height: 'var(--appbar-height)',
            minHeight: 'var(--appbar-height)',
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
            minHeight: 'var(--toolbar-height) !important',
            height: 'var(--toolbar-height) !important',
            paddingTop: '0 !important',
            paddingBottom: '0 !important',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#0f172a' : colors.neutral[0],
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
            borderRadius: 'var(--list-item-border-radius)',
            margin: 0,
            '&:hover': {
              backgroundColor: isDark ? alpha('#e2e8f0', 0.04) : alpha(colors.neutral[100], 0.04),
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? alpha(colors.primary[500], 0.12) : colors.neutral[5],
              '&:hover': {
                backgroundColor: isDark ? alpha(colors.primary[500], 0.16) : colors.neutral[5],
              },
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            borderRadius: 'var(--tab-indicator-border-radius)',
            height: 'var(--tab-indicator-height)',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 'var(--tab-font-weight)',
            fontSize: 'var(--tab-font-size)',
            minHeight: 'var(--tab-min-height)',
            '&.Mui-selected': {
              fontWeight: 'var(--tab-selected-font-weight)',
            },
          },
        },
      },
    },
    cssVariables: true
  });
};

export default createAppTheme;