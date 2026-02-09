import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

import { proyectosService } from '@/services/proyectos.service';
import { Proyecto } from '@/types/proyecto.types';

interface EliminarProyectoDialogProps {
  open: boolean;
  proyecto: Proyecto;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EliminarProyectoDialog({
  open,
  proyecto,
  onClose,
  onSuccess,
}: EliminarProyectoDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => proyectosService.delete(proyecto.uuid_proyecto),
    onSuccess: () => {
      handleClose();
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al eliminar proyecto');
    },
  });

  const handleClose = () => {
    setConfirmed(false);
    setError('');
    onClose();
  };

  const handleDelete = () => {
    if (!confirmed) {
      setError('Debes confirmar que entiendes que esta acción es irreversible');
      return;
    }

    deleteMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningIcon color="error" />
        Eliminar Proyecto
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Alert severity="warning" sx={{ mb: 2 }}>
          Esta acción eliminará el proyecto <strong>{proyecto.nombre_proyecto}</strong> y{' '}
          <strong>TODAS las plantillas asociadas</strong>.
        </Alert>

        <Typography variant="body2" color="text.secondary" paragraph>
          El proyecto será marcado como eliminado, pero los datos históricos de emisiones
          se mantendrán en la base de datos.
        </Typography>

        <Box sx={{ mt: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                color="error"
              />
            }
            label="Entiendo que esta acción es irreversible"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={deleteMutation.isPending}>
          Cancelar
        </Button>
        <Button
          onClick={handleDelete}
          variant="contained"
          color="error"
          disabled={deleteMutation.isPending || !confirmed}
        >
          {deleteMutation.isPending ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Eliminando...
            </>
          ) : (
            'Eliminar Proyecto'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}