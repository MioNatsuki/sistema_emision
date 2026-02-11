import { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import * as fabric from 'fabric';

const DRAWER_WIDTH = 280;
const SCALE_FACTOR = 2.5; // Debe coincidir con PlantillaEditor

interface PropertiesPanelProps {
  selectedObject: fabric.Object | null;
  canvas: fabric.Canvas | null;
  onUpdate: () => void;
}

export default function PropertiesPanel({
  selectedObject,
  canvas,
  onUpdate,
}: PropertiesPanelProps) {
  const [contenido, setContenido] = useState('');
  const [fuente, setFuente] = useState('Calibri');
  const [tamano, setTamano] = useState(11);
  const [negrita, setNegrita] = useState(false);
  const [italica, setItalica] = useState(false);
  const [color, setColor] = useState('#000000');
  const [alineacion, setAlineacion] = useState('left');

  // Cargar valores del objeto seleccionado
  useEffect(() => {
    if (!selectedObject) return;

    if (selectedObject.type === 'text' || selectedObject.type === 'i-text') {
      const textObj = selectedObject as fabric.Text;
      setContenido(textObj.text || '');
      setFuente(textObj.fontFamily || 'Calibri');
      // Convertir el tamaño escalado de vuelta al tamaño real
      setTamano(Math.round((textObj.fontSize || 11) / SCALE_FACTOR));
      setNegrita(textObj.fontWeight === 'bold');
      setItalica(textObj.fontStyle === 'italic');
      setColor(textObj.fill?.toString() || '#000000');
      setAlineacion(textObj.textAlign || 'left');
    }
  }, [selectedObject]);

  const updateObject = (updates: Partial<fabric.Text>) => {
    if (!selectedObject || !canvas) return;

    Object.assign(selectedObject, updates);
    canvas.renderAll();
    onUpdate();
  };

  const handleContenidoChange = (value: string) => {
    setContenido(value);
    if (selectedObject && (selectedObject.type === 'text' || selectedObject.type === 'i-text')) {
      (selectedObject as fabric.Text).set('text', value);
      canvas?.renderAll();
      onUpdate();
    }
  };

  const handleFuenteChange = (value: string) => {
    setFuente(value);
    updateObject({ fontFamily: value });
  };

  const handleTamanoChange = (value: number) => {
    setTamano(value);
    // Escalar el tamaño de fuente para el canvas
    updateObject({ fontSize: value * SCALE_FACTOR });
  };

  const handleNegritaChange = (checked: boolean) => {
    setNegrita(checked);
    updateObject({ fontWeight: checked ? 'bold' : 'normal' });
  };

  const handleItalicaChange = (checked: boolean) => {
    setItalica(checked);
    updateObject({ fontStyle: checked ? 'italic' : 'normal' });
  };

  const handleColorChange = (value: string) => {
    setColor(value);
    updateObject({ fill: value });
  };

  const handleAlineacionChange = (value: string) => {
    setAlineacion(value);
    updateObject({ textAlign: value as 'left' | 'center' | 'right' });
  };

  if (!selectedObject) return null;

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2, mt: 8 }}>
        <Typography variant="h6" gutterBottom>
          Propiedades
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Solo mostrar propiedades para texto */}
        {(selectedObject.type === 'text' || selectedObject.type === 'i-text') && (
          <>
            {/* Contenido */}
            <TextField
              fullWidth
              label="Contenido"
              value={contenido}
              onChange={(e) => handleContenidoChange(e.target.value)}
              margin="normal"
              multiline
              rows={3}
              size="small"
            />

            {/* Fuente */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Fuente</InputLabel>
              <Select
                value={fuente}
                label="Fuente"
                onChange={(e) => handleFuenteChange(e.target.value)}
              >
                <MenuItem value="Calibri">Calibri</MenuItem>
                <MenuItem value="Arial">Arial</MenuItem>
                <MenuItem value="Times New Roman">Times New Roman</MenuItem>
                <MenuItem value="Courier New">Courier New</MenuItem>
                <MenuItem value="Verdana">Verdana</MenuItem>
              </Select>
            </FormControl>

            {/* Tamaño */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Tamaño</InputLabel>
              <Select
                value={tamano}
                label="Tamaño"
                onChange={(e) => handleTamanoChange(Number(e.target.value))}
              >
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Estilo */}
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={negrita}
                    onChange={(e) => handleNegritaChange(e.target.checked)}
                    size="small"
                  />
                }
                label="Negrita"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={italica}
                    onChange={(e) => handleItalicaChange(e.target.checked)}
                    size="small"
                  />
                }
                label="Itálica"
              />
            </Box>

            {/* Color */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Color
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  style={{ width: 50, height: 35, border: 'none', cursor: 'pointer' }}
                />
                <TextField
                  value={color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
              </Box>
            </Box>

            {/* Alineación */}
            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Alineación</InputLabel>
              <Select
                value={alineacion}
                label="Alineación"
                onChange={(e) => handleAlineacionChange(e.target.value)}
              >
                <MenuItem value="left">Izquierda</MenuItem>
                <MenuItem value="center">Centro</MenuItem>
                <MenuItem value="right">Derecha</MenuItem>
              </Select>
            </FormControl>

            {/* Info de posición y tamaño */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" display="block" color="text.secondary">
              <strong>Posición en canvas:</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              X: {selectedObject.left?.toFixed(0)}px
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Y: {selectedObject.top?.toFixed(0)}px
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ancho: {((selectedObject.width || 0) * (selectedObject.scaleX || 1)).toFixed(0)}px
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Alto: {((selectedObject.height || 0) * (selectedObject.scaleY || 1)).toFixed(0)}px
            </Typography>
          </>
        )}
      </Box>
    </Drawer>
  );
}