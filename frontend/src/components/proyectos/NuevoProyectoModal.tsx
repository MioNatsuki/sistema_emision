import { useState } from 'react';
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
import { ProyectoCreate } from '@/types/proyecto.types';

interface NuevoProyectoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NuevoProyectoModal({
  open,
  onClose,
  onSuccess,
}: NuevoProyectoModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [padronId, setPadronId] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Obtener padrones
  const { data: padrones, isLoading: loadingPadrones } = useQuery({
    queryKey: ['padrones'],
    queryFn: proyectosService.getPadrones,
    enabled: open,
  });

  // Mutation para crear proyecto
  const createMutation = useMutation({
    mutationFn: proyectosService.create,
    onSuccess: async (proyecto) => {
      // Si hay logo, subirlo
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
      setError(err.response?.data?.detail || 'Error al crear proyecto');
    },
  });

  const handleClose = () => {
    setNombre('');
    setDescripcion('');
    setPadronId('');
    setLogoFile(null);
    setLogoPreview(null);
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

    const data: ProyectoCreate = {
      nombre_proyecto: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      uuid_padron: padronId,
    };

    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Nuevo Proyecto
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
                Seleccionar Logo
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleLogoChange}
                />
              </Button>
              <Box sx={{ mt: 1 }}>
                <small style={{ color: '#666' }}>
                  JPG/PNG, máx 2MB
                </small>
              </Box>
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
            disabled={createMutation.isPending}
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
            disabled={createMutation.isPending}
          />

          {/* Padrón */}
          <FormControl fullWidth margin="normal" required>
            <InputLabel>Padrón</InputLabel>
            <Select
              value={padronId}
              onChange={(e) => setPadronId(e.target.value)}
              label="Padrón"
              disabled={createMutation.isPending || loadingPadrones}
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
                    {padron.descripcion && (
                      <span style={{ fontSize: '0.85em', color: '#666', marginLeft: 8 }}>
                        - {padron.descripcion}
                      </span>
                    )}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Creando...
              </>
            ) : (
              'Crear Proyecto'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}