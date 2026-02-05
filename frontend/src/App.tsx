import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from './styles/theme';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Sistema de Emisiones</h1>
          <p>Frontend configurado correctamente ✅</p>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;