import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';

import { Typography } from '@mui/material';

import { plantillasService } from '@/services/plantillas.service';

interface CampoSelectorProps {
  open: boolean;
  nombrePadron: string;
  onClose: () => void;
  onSelect: (campo: string, etiqueta?: string) => void;
}

export default function CampoSelector({
  open,
  nombrePadron,
  onClose,
  onSelect,
}: CampoSelectorProps) {
  const [campoSeleccionado, setCampoSeleccionado] = useState('');
  const [etiqueta, setEtiqueta] = useState('');
  const [conEtiqueta, setConEtiqueta] = useState(false);

  const { data: campos, isLoading, error } = useQuery({
    queryKey: ['campos-padron', nombrePadron],
    queryFn: () => plantillasService.getCamposPadron(nombrePadron),
    enabled: open && !!nombrePadron,
  });

  const handleClose = () => {
    setCampoSeleccionado('');
    setEtiqueta('');
    setConEtiqueta(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campoSeleccionado) {
      return;
    }

    onSelect(campoSeleccionado, conEtiqueta ? etiqueta : undefined);
    handleClose();
  };

  // Auto-generar etiqueta cuando se selecciona un campo
  useEffect(() => {
    if (campoSeleccionado && !etiqueta) {
      // Convertir snake_case a Title Case
      const label = campoSeleccionado
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setEtiqueta(label + ':');
    }
  }, [campoSeleccionado]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Seleccionar Campo de Base de Datos</DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error">
              Error al cargar los campos del padrón
            </Alert>
          )}

          {campos && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Los campos se insertarán como <strong>{'{nombre_campo}'}</strong> y serán
                reemplazados con datos reales al generar los PDFs.
              </Alert>

              {/* Selector de campo */}
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Campo</InputLabel>
                <Select
                  value={campoSeleccionado}
                  onChange={(e) => setCampoSeleccionado(e.target.value)}
                  label="Campo"
                >
                  {campos.map((campo) => (
                    <MenuItem key={campo.nombre_columna} value={campo.nombre_columna}>
                      {campo.nombre_columna}
                      <Chip
                        label={campo.tipo_dato}
                        size="small"
                        sx={{ ml: 1 }}
                        variant="outlined"
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Opción de agregar etiqueta */}
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth>
                  <label>
                    <input
                      type="checkbox"
                      checked={conEtiqueta}
                      onChange={(e) => setConEtiqueta(e.target.checked)}
                    />
                    {' '}Agregar etiqueta antes del campo
                  </label>
                </FormControl>
              </Box>

              {conEtiqueta && (
                <TextField
                  fullWidth
                  label="Etiqueta"
                  value={etiqueta}
                  onChange={(e) => setEtiqueta(e.target.value)}
                  margin="normal"
                  placeholder="Ej: Nombre:"
                  helperText="Se mostrará como texto plano antes del campo"
                />
              )}

              {/* Preview */}
              {campoSeleccionado && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Vista previa:
                  </Typography>
                  <Typography variant="body1">
                    {conEtiqueta && etiqueta && (
                      <span style={{ color: '#000' }}>{etiqueta} </span>
                    )}
                    <span style={{ color: '#0066cc', fontWeight: 'bold' }}>
                      {'{' + campoSeleccionado + '}'}
                    </span>
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!campoSeleccionado}
          >
            Agregar Campo
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}