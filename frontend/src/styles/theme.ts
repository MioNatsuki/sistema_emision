import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#abe4ff', // color4
      light: '#d9abff', // color5
      dark: '#7bb8d9',
    },
    secondary: {
      main: '#ffdaab', // color2
      light: '#ffabab', // color1
      dark: '#ddb87a',
    },
    success: {
      main: '#ddffab', // color3
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Calibri", "Roboto", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});