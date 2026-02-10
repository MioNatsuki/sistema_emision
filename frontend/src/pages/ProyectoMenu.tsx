import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  CardActions,
  //IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
//import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';

import { proyectosService } from '@/services/proyectos.service';
import { plantillasService } from '@/services/plantillas.service';
import { useAuthStore } from '@/store/authStore';
import NuevaPlantillaDialog from '@/components/plantillas/NuevaPlantillaDialog';

export default function ProyectoMenu() {
  const { proyectoId } = useParams<{ proyectoId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: proyecto, isLoading: loadingProyecto, error: errorProyecto } = useQuery({
    queryKey: ['proyecto', proyectoId],
    queryFn: () => proyectosService.getById(proyectoId!),
    enabled: !!proyectoId,
  });

  const { data: plantillas, isLoading: loadingPlantillas, error: errorPlantillas, refetch } = useQuery({
    queryKey: ['plantillas', proyectoId],
    queryFn: () => plantillasService.getByProyecto(proyectoId!),
    enabled: !!proyectoId,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleEditPlantilla = (plantillaUuid: string) => {
    navigate(`/plantilla/${plantillaUuid}/editor`);
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
        {/* Info del proyecto */}
        {loadingProyecto && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {errorProyecto && (
          <Alert severity="error">Error al cargar el proyecto</Alert>
        )}

        {proyecto && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="body1" color="text.secondary">
              {proyecto.descripcion || 'Sin descripción'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <strong>Padrón:</strong> {proyecto.nombre_padron}
            </Typography>
          </Box>
        )}

        {/* Sección de plantillas */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">Plantillas</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            Nueva Plantilla
          </Button>
        </Box>

        {loadingPlantillas && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {errorPlantillas && (
          <Alert severity="error">Error al cargar las plantillas</Alert>
        )}

        {plantillas && (
          <Grid container spacing={3}>
            {plantillas.length === 0 ? (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No hay plantillas aún
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Crea tu primera plantilla para comenzar
                  </Typography>
                </Box>
              </Grid>
            ) : (
              plantillas.map((plantilla) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={plantilla.uuid_plantilla}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6" noWrap>
                          {plantilla.nombre_plantilla}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {plantilla.descripcion || 'Sin descripción'}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Versión: {plantilla.version}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        Creada: {new Date(plantilla.created_on).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditPlantilla(plantilla.uuid_plantilla)}
                      >
                        Editar
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Container>

      {/* Dialog de nueva plantilla */}
      {proyecto && (
        <NuevaPlantillaDialog
          open={dialogOpen}
          proyecto={proyecto}
          onClose={() => setDialogOpen(false)}
          onSuccess={(plantillaUuid) => {
            setDialogOpen(false);
            refetch();
            navigate(`/plantilla/${plantillaUuid}/editor`);
          }}
        />
      )}
    </Box>
  );
}