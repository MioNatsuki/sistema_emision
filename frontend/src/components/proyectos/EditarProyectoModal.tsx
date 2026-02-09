import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  IconButton,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { proyectosService } from '@/services/proyectos.service';
import { Proyecto, ProyectoUpdate } from '@/types/proyecto.types';

interface EditarProyectoModalProps {
  open: boolean;
  proyecto: Proyecto;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditarProyectoModal({
  open,
  proyecto,
  onClose,
  onSuccess,
}: EditarProyectoModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [padronId, setPadronId] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Cargar datos del proyecto
  useEffect(() => {
    if (open && proyecto) {
      setNombre(proyecto.nombre_proyecto);
      setDescripcion(proyecto.descripcion || '');
      setPadronId(proyecto.uuid_padron);
      setLogoPreview(
        proyecto.logo_proyecto
          ? `http://localhost:8000${proyecto.logo_proyecto}`
          : null
      );
    }
  }, [open, proyecto]);

  // Obtener padrones
  const { data: padrones, isLoading: loadingPadrones } = useQuery({
    queryKey: ['padrones'],
    queryFn: proyectosService.getPadrones,
    enabled: open,
  });

  // Mutation para actualizar proyecto
  const updateMutation = useMutation({
    mutationFn: (data: ProyectoUpdate) =>
      proyectosService.update(proyecto.uuid_proyecto, data),
    onSuccess: async () => {
    //onSuccess: async (updatedProyecto) => {
      // Si hay nuevo logo, subirlo
      if (logoFile) {
        try {
          await proyectosService.uploadLogo(proyecto.uuid_proyecto, logoFile);
        } catch (err) {
          console.error('Error al subir logo:', err);
        }
      }
      handleClose();
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al actualizar proyecto');
    },
  });

  const handleClose = () => {
    setLogoFile(null);
    setError('');
    onClose();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes');
        return;
      }

      // Validar tamaño (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('La imagen no debe superar 2MB');
        return;
      }

      setLogoFile(file);
      setError('');

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!padronId) {
      setError('Debes seleccionar un padrón');
      return;
    }

    const data: ProyectoUpdate = {
      nombre_proyecto: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      uuid_padron: padronId,
    };

    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Editar Proyecto
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Logo Preview */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Avatar
                src={logoPreview || undefined}
                sx={{ width: 120, height: 120, mb: 1, mx: 'auto' }}
              />
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadFileIcon />}
                size="small"
              >
                Cambiar Logo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </Button>
            </Box>
          </Box>

          {/* Nombre */}
          <TextField
            fullWidth
            label="Nombre del Proyecto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            margin="normal"
            required
            disabled={updateMutation.isPending}
          />

          {/* Descripción */}
          <TextField
            fullWidth
            label="Descripción"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            margin="normal"
            multiline
            rows={3}
            disabled={updateMutation.isPending}
          />

          {/* Padrón */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Padrón</InputLabel>
            <Select
              value={padronId}
              onChange={(e) => setPadronId(e.target.value)}
              label="Padrón"
              disabled={updateMutation.isPending || loadingPadrones}
            >
              {loadingPadrones ? (
                <MenuItem disabled>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Cargando...
                </MenuItem>
              ) : (
                padrones?.map((padron) => (
                  <MenuItem key={padron.uuid_padron} value={padron.uuid_padron}>
                    {padron.nombre_padron}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}