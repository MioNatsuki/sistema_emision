import { useNavigate } from 'react-router-dom';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Paper,
} from '@mui/material';
import { useAuthStore } from '@/store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Sistema de Emisiones
          </Typography>
          <Typography variant="body1" sx={{ mr: 2 }}>
            {user?.nombre} {user?.apellido}
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      {/* Contenido */}
      <Container sx={{ mt: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            ¡Bienvenido, {user?.nombre}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Dashboard en construcción... 🚧
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Usuario:</strong> {user?.username}
            </Typography>
            <Typography variant="body2">
              <strong>Email:</strong> {user?.email}
            </Typography>
            <Typography variant="body2">
              <strong>UUID:</strong> {user?.uuid_usuario}
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}