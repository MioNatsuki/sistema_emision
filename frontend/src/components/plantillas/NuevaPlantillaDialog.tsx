import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';

import { plantillasService } from '@/services/plantillas.service';
import { PlantillaCreate } from '@/types/plantilla.types';
import { Proyecto } from '@/types/proyecto.types';

interface NuevaPlantillaDialogProps {
  open: boolean;
  proyecto: Proyecto;
  onClose: () => void;
  onSuccess: (plantillaUuid: string) => void;
}

export default function NuevaPlantillaDialog({
  open,
  proyecto,
  onClose,
  onSuccess,
}: NuevaPlantillaDialogProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: plantillasService.create,
    onSuccess: (plantilla) => {
      handleClose();
      onSuccess(plantilla.uuid_plantilla);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al crear plantilla');
    },
  });

  const handleClose = () => {
    setNombre('');
    setDescripcion('');
    setError('');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const data: PlantillaCreate = {
      nombre_plantilla: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      uuid_proyecto: proyecto.uuid_proyecto,
      uuid_padron: proyecto.uuid_padron,
      canvas_config: {
        elementos: [],
        configuracion_global: {
          margen_superior: 1.0,
          margen_inferior: 1.0,
          margen_izquierdo: 1.0,
          margen_derecho: 1.0,
          color_fondo: '#FFFFFF',
        },
      },
      ancho_canvas: 21.59,
      alto_canvas: 34.01,
    };

    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Nueva Plantilla</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Nombre de la Plantilla"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            margin="normal"
            required
            disabled={createMutation.isPending}
            autoFocus
          />

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
              'Crear y Abrir Editor'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}