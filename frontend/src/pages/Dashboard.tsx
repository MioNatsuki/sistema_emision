import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';

import { useAuthStore } from '@/store/authStore';
import { proyectosService } from '@/services/proyectos.service';
import ProyectoCard from '@/components/proyectos/ProyectoCard';
import NuevoProyectoModal from '@/components/proyectos/NuevoProyectoModal';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);

  const { data: proyectos, isLoading, error, refetch } = useQuery({
    queryKey: ['proyectos'],
    queryFn: proyectosService.getAll,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Proyectos</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
          >
            Nuevo Proyecto
          </Button>
        </Box>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">
            Error al cargar los proyectos. Por favor intenta de nuevo.
          </Alert>
        )}

        {proyectos && (
          <Grid container spacing={3}>
            {proyectos.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary">
                    No hay proyectos aún
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Crea tu primer proyecto para comenzar
                  </Typography>
                </Box>
              </Grid>
            ) : (
              proyectos.map((proyecto) => (
                <Grid  size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={proyecto.uuid_proyecto} >
                  <ProyectoCard proyecto={proyecto} onUpdate={refetch} />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Container>

      <NuevoProyectoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          refetch();
        }}
      />
    </Box>
  );
}