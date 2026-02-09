import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { proyectosService } from '@/services/proyectos.service';
import { useAuthStore } from '@/store/authStore';

export default function ProyectoMenu() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const { data: proyecto, isLoading, error } = useQuery({
    queryKey: ['proyecto', proyectoId],
    queryFn: () => proyectosService.getById(proyectoId!),
    enabled: !!proyectoId,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <Box>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Button
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Volver
          </Button>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {proyecto?.nombre_proyecto || 'Cargando...'}
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
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            Error al cargar el proyecto
          </Alert>
        )}

        {proyecto && (
          <Paper sx={{ p: 4 }}>
            <Typography variant="h4" gutterBottom>
              {proyecto.nombre_proyecto}
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {proyecto.descripcion || 'Sin descripción'}
            </Typography>
            <Typography variant="body2">
              <strong>Padrón:</strong> {proyecto.nombre_padron}
            </Typography>
            <Typography variant="body2">
              <strong>UUID:</strong> {proyecto.uuid_proyecto}
            </Typography>

            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Plantillas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Esta sección estará disponible en la Semana 4-5 🚧
              </Typography>
            </Box>
          </Paper>
        )}
      </Container>
    </Box>
  );
}