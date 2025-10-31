import { createTheme } from '@mui/material/styles';

// Minimal wireframe color palette - only black, white, and grays
const wireframeColors = {
  black: '#000000',
  white: '#FFFFFF',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  }
};

// Wireframe theme configuration
export const createWireframeTheme = () => {
  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: wireframeColors.black,
        light: wireframeColors.gray[700],
        dark: wireframeColors.black,
        contrastText: wireframeColors.white,
      },
      secondary: {
        main: wireframeColors.gray[600],
        light: wireframeColors.gray[400],
        dark: wireframeColors.gray[800],
        contrastText: wireframeColors.white,
      },
      success: {
        main: wireframeColors.black,
        light: wireframeColors.gray[700],
        dark: wireframeColors.black,
      },
      warning: {
        main: wireframeColors.gray[600],
        light: wireframeColors.gray[400],
        dark: wireframeColors.gray[800],
      },
      error: {
        main: wireframeColors.black,
        light: wireframeColors.gray[700],
        dark: wireframeColors.black,
      },
      info: {
        main: wireframeColors.gray[600],
        light: wireframeColors.gray[400],
        dark: wireframeColors.gray[800],
      },
      background: {
        default: wireframeColors.white,
        paper: wireframeColors.white,
      },
      text: {
        primary: wireframeColors.black,
        secondary: wireframeColors.gray[600],
        disabled: wireframeColors.gray[400],
      },
      divider: wireframeColors.gray[300],
      action: {
        hover: wireframeColors.gray[50],
        selected: wireframeColors.gray[100],
        disabled: wireframeColors.gray[300],
        disabledBackground: wireframeColors.gray[100],
      },
      grey: wireframeColors.gray,
    },
    typography: {
      fontFamily: '"Courier New", "Courier", monospace',
      allVariants: {
        color: wireframeColors.black,
      },
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: 0,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: 0,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
        letterSpacing: 0,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: 0,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: 400,
        lineHeight: 1.6,
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.5,
        textTransform: 'uppercase' as const,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: 1.5,
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: 1.5,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.08em',
      },
    },
    spacing: 8,
    shape: {
      borderRadius: 0, // No rounded corners in wireframe
    },
    shadows: [
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            MozOsxFontSmoothing: 'auto',
            WebkitFontSmoothing: 'auto',
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
            backgroundColor: wireframeColors.white,
          },
          '#root': {
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
          },
          '*': {
            boxSizing: 'border-box',
          },
          // Simple grayscale for images
          img: {
            filter: 'grayscale(100%) contrast(1.2)',
            opacity: 0.8,
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            padding: '8px 16px',
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.5,
            textTransform: 'uppercase',
            boxShadow: 'none',
            border: `2px solid ${wireframeColors.black}`,
            '&:hover': {
              boxShadow: 'none',
              backgroundColor: wireframeColors.gray[100],
            },
            '&:active': {
              boxShadow: 'none',
            },
          },
          contained: {
            backgroundColor: wireframeColors.white,
            color: wireframeColors.black,
            '&:hover': {
              backgroundColor: wireframeColors.gray[100],
            },
          },
          outlined: {
            borderWidth: 2,
            '&:hover': {
              borderWidth: 2,
              backgroundColor: wireframeColors.gray[50],
            },
          },
          text: {
            border: 'none',
            textDecoration: 'underline',
            '&:hover': {
              backgroundColor: 'transparent',
              textDecoration: 'underline',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: wireframeColors.black,
            '&:hover': {
              backgroundColor: wireframeColors.gray[100],
            },
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: wireframeColors.white,
            boxShadow: 'none',
            border: `2px solid ${wireframeColors.black}`,
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: wireframeColors.white,
            border: `1px solid ${wireframeColors.black}`,
            boxShadow: 'none',
          },
          outlined: {
            border: `2px solid ${wireframeColors.black}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              backgroundColor: wireframeColors.white,
              '& fieldset': {
                borderColor: wireframeColors.black,
                borderWidth: 2,
              },
              '&:hover fieldset': {
                borderColor: wireframeColors.black,
                borderWidth: 2,
              },
              '&.Mui-focused fieldset': {
                borderColor: wireframeColors.black,
                borderWidth: 3,
              },
            },
            '& .MuiInputLabel-root': {
              color: wireframeColors.black,
              '&.Mui-focused': {
                color: wireframeColors.black,
              },
            },
          },
        },
      },
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            color: wireframeColors.black,
            boxShadow: 'none',
            borderRadius: 0,
            borderBottom: `2px solid ${wireframeColors.black}`,
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: '64px',
            height: '64px',
            backgroundColor: 'transparent',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: 'transparent',
            borderRadius: 0,
            borderRight: `2px solid ${wireframeColors.black}`,
            boxShadow: 'none',
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            '&:hover': {
              backgroundColor: wireframeColors.gray[100],
            },
            '&.Mui-selected': {
              backgroundColor: wireframeColors.gray[200],
              '&:hover': {
                backgroundColor: wireframeColors.gray[300],
              },
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: wireframeColors.gray[100],
            },
            '&.Mui-selected': {
              backgroundColor: wireframeColors.gray[200],
              '&:hover': {
                backgroundColor: wireframeColors.gray[300],
              },
            },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            borderBottom: `2px solid ${wireframeColors.black}`,
          },
          indicator: {
            backgroundColor: wireframeColors.black,
            height: 3,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'uppercase',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 48,
            color: wireframeColors.gray[600],
            '&.Mui-selected': {
              color: wireframeColors.black,
              fontWeight: 600,
            },
            '&:hover': {
              color: wireframeColors.black,
              backgroundColor: wireframeColors.gray[50],
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: wireframeColors.white,
            border: `1px solid ${wireframeColors.black}`,
            color: wireframeColors.black,
          },
          deleteIcon: {
            color: wireframeColors.black,
            '&:hover': {
              color: wireframeColors.gray[600],
            },
          },
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: wireframeColors.gray[200],
            color: wireframeColors.black,
            border: `2px solid ${wireframeColors.black}`,
            borderRadius: 0,
            fontFamily: '"Courier New", monospace',
            fontWeight: 'bold',
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            backgroundColor: wireframeColors.black,
            height: 1,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            border: `2px solid ${wireframeColors.black}`,
            boxShadow: 'none',
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            boxShadow: 'none',
            backgroundColor: wireframeColors.white,
            color: wireframeColors.black,
            border: `2px solid ${wireframeColors.black}`,
            '&:hover': {
              boxShadow: 'none',
              backgroundColor: wireframeColors.gray[100],
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: wireframeColors.black,
            color: wireframeColors.white,
            fontSize: '0.75rem',
            fontFamily: '"Courier New", monospace',
            borderRadius: 0,
          },
          arrow: {
            color: wireframeColors.black,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            backgroundColor: wireframeColors.white,
            color: wireframeColors.black,
            border: `2px solid ${wireframeColors.black}`,
            '& .MuiAlert-icon': {
              color: wireframeColors.black,
            },
          },
        },
      },
      MuiSkeleton: {
        styleOverrides: {
          root: {
            backgroundColor: wireframeColors.gray[200],
            borderRadius: 0,
            '&::after': {
              background: `linear-gradient(90deg, transparent, ${wireframeColors.gray[300]}, transparent)`,
            },
          },
        },
      },
    },cssVariables: true
  });
};

export default createWireframeTheme;