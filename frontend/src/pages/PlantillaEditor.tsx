import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as fabric from 'fabric';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ImageIcon from '@mui/icons-material/Image';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DeleteIcon from '@mui/icons-material/Delete';
import BugReportIcon from '@mui/icons-material/BugReport';

import { plantillasService } from '@/services/plantillas.service';
import { useAuthStore } from '@/store/authStore';
import PropertiesPanel from '@/components/plantillas/PropertiesPanel';
import CampoSelector from '@/components/plantillas/CampoSelector';

const DRAWER_WIDTH = 240;
// const PROPERTIES_WIDTH = 280; // No usado actualmente, puedes removerlo si no lo usas

// Tamaño optimizado para México Oficio (21.59 x 34.01 cm a 72 dpi)
const CANVAS_WIDTH = 612;
const CANVAS_HEIGHT = 936;

export default function PlantillaEditor() {
  const { plantillaId } = useParams<{ plantillaId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [campoSelectorOpen, setCampoSelectorOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Obtener plantilla
  const { data: plantilla, isLoading } = useQuery({
    queryKey: ['plantilla', plantillaId],
    queryFn: () => plantillasService.getById(plantillaId!),
    enabled: !!plantillaId,
  });

  // Mutation para guardar
  const saveMutation = useMutation({
    mutationFn: () => {
      const canvasData = exportCanvasConfig();

      if (debugMode) {
        console.log('Guardando configuración:', canvasData);
      }

      return plantillasService.update(plantillaId!, {
        canvas_config: canvasData,
      });
    },
    onSuccess: () => {
      setSuccess('Plantilla guardada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.detail || 'Error al guardar plantilla';
      setError(errorMsg);
      console.error('Error al guardar:', err);
    },
  });

  // ==================== INICIALIZAR CANVAS ====================
  useEffect(() => {
    if (!canvasRef.current) return;
    if (fabricCanvasRef.current) {
      console.log('Canvas ya existe, skipping inicialización');
      return;
    }

    console.log('Inicializando canvas Fabric.js v6...');

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#FFFFFF',
      selection: true,
      preserveObjectStacking: true,
    });

    // Forzar tamaño visible
    if (canvasRef.current) {
      canvasRef.current.style.width = `${CANVAS_WIDTH}px`;
      canvasRef.current.style.height = `${CANVAS_HEIGHT}px`;
      canvasRef.current.style.display = 'block';
      canvasRef.current.style.border = '1px solid #ccc';
      canvasRef.current.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    }

    // Grid
    const gridSize = 50;
    const gridColor = '#e0e0e0';

    // Líneas verticales
    for (let i = 0; i <= Math.ceil(CANVAS_WIDTH / gridSize); i++) {
      const line = new fabric.Line(
        [i * gridSize, 0, i * gridSize, CANVAS_HEIGHT],
        {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
          objectCaching: false,
        }
      );
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }

    // Líneas horizontales
    for (let i = 0; i <= Math.ceil(CANVAS_HEIGHT / gridSize); i++) {
      const line = new fabric.Line(
        [0, i * gridSize, CANVAS_WIDTH, i * gridSize],
        {
          stroke: gridColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true,
          objectCaching: false,
        }
      );
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }

    // Eventos
    canvas.on('selection:created', (e) => {
      const selected = e.selected?.[0];
      if (selected && (selected as any).excludeFromExport) {
        canvas.discardActiveObject();
        return;
      }
      setSelectedObject(selected || null);
    });

    canvas.on('selection:updated', (e) => {
      const selected = e.selected?.[0];
      if (selected && (selected as any).excludeFromExport) {
        canvas.discardActiveObject();
        return;
      }
      setSelectedObject(selected || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Debug events (opcional)
    if (debugMode) {
      canvas.on('object:modified', (e) => console.log('Objeto modificado:', e.target));
      canvas.on('object:added', (e) => console.log('Objeto agregado:', (e.target as any)?.customType || e.target?.type));
      canvas.on('object:removed', (e) => console.log('Objeto eliminado:', (e.target as any)?.customType || e.target?.type));
    }

    fabricCanvasRef.current = canvas;
    console.log('Canvas inicializado y guardado en ref');

    return () => {
      console.log('Limpiando canvas...');
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose().catch((e) => console.error('Error en dispose:', e));
        fabricCanvasRef.current = null;
      }
    };
  }, [debugMode]); // ← debugMode como dependencia para re-registrar listeners de debug si cambia

  // ==================== CARGAR CONFIGURACIÓN ====================
  useEffect(() => {
    if (!fabricCanvasRef.current || !plantilla) return;

    console.log('Cargando plantilla:', plantilla.nombre_plantilla);
    loadCanvasConfig(plantilla.canvas_config);
  }, [plantilla]);

  const loadCanvasConfig = (config: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Limpiar (excepto grid)
    canvas.getObjects().forEach((obj) => {
      if (!(obj as any).excludeFromExport) {
        canvas.remove(obj);
      }
    });

    const elementos = config?.elementos || [];
    elementos.forEach((el: any) => {
      switch (el.tipo) {
        case 'texto_plano':
          addTextoPlano(el.contenido, el.x, el.y, el.estilo);
          break;
        case 'campo_bd':
          addCampoBD(el.campo_nombre, el.x, el.y, el.estilo);
          break;
        default:
          console.warn(`Tipo desconocido: ${el.tipo}`);
      }
    });

    canvas.renderAll();
  };

  const exportCanvasConfig = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.warn('Canvas no disponible para exportar');
      return { elementos: [] };
    }

    const elementos = canvas
      .getObjects()
      .filter((obj) => !(obj as any).excludeFromExport)
      .map((obj, index) => {
        const common = {
          id: (obj as any).customId || `elem_${Date.now()}_${index}`,
          x: (obj.left! / CANVAS_WIDTH) * 21.59,
          y: (obj.top! / CANVAS_HEIGHT) * 34.01,
          ancho: ((obj.width! * (obj.scaleX || 1)) / CANVAS_WIDTH) * 21.59,
          alto: ((obj.height! * (obj.scaleY || 1)) / CANVAS_HEIGHT) * 34.01,
        };

        if (obj.type === 'text' || obj.type === 'i-text') {
          const t = obj as fabric.Text;
          const customType = (obj as any).customType;

          if (customType === 'texto_plano') {
            return {
              ...common,
              tipo: 'texto_plano',
              contenido: t.text || '',
              estilo: {
                fuente: t.fontFamily || 'Calibri',
                tamano: t.fontSize || 11,
                negrita: t.fontWeight === 'bold',
                italica: t.fontStyle === 'italic',
                color: t.fill?.toString() || '#000000',
                alineacion: t.textAlign || 'left',
              },
            };
          }

          if (customType === 'campo_bd') {
            return {
              ...common,
              tipo: 'campo_bd',
              contenido: t.text || '',
              estilo: {
                fuente: t.fontFamily || 'Calibri',
                tamano: t.fontSize || 11,
                negrita: t.fontWeight === 'bold',
                italica: t.fontStyle === 'italic',
                color: t.fill?.toString() || '#000000',
                alineacion: t.textAlign || 'left',
              },
              campo_nombre: (obj as any).customData?.campo_nombre || '',
            };
          }
        }
        return undefined;
      })
      .filter(Boolean); 

    return {
      elementos: elementos as any,
      configuracion_global: {
        margen_superior: 1.0,
        margen_inferior: 1.0,
        margen_izquierdo: 1.0,
        margen_derecho: 1.0,
        color_fondo: '#FFFFFF',
      },
    };
  };

  // ==================== AGREGAR ELEMENTOS ====================
  const addTextoPlano = (texto: string = 'Texto', x?: number, y?: number, estilo?: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.warn('Canvas no inicializado');
      return;
    }

    const left = x !== undefined ? (x / 21.59) * CANVAS_WIDTH : 100;
    const top = y !== undefined ? (y / 34.01) * CANVAS_HEIGHT : 100;

    const text = new fabric.IText(texto, {
      left,
      top,
      fontFamily: estilo?.fuente || 'Calibri',
      fontSize: estilo?.tamano || 11,
      fontWeight: estilo?.negrita ? 'bold' : 'normal',
      fontStyle: estilo?.italica ? 'italic' : 'normal',
      fill: estilo?.color || '#000000',
      textAlign: estilo?.alineacion || 'left',
      editable: true,
    });

    (text as any).customId = `elem_${Date.now()}`;
    (text as any).customType = 'texto_plano';

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addCampoBD = (campo: string, x?: number, y?: number, estilo?: any) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      console.warn('Canvas no inicializado');
      return;
    }

    const left = x !== undefined ? (x / 21.59) * CANVAS_WIDTH : 100;
    const top = y !== undefined ? (y / 34.01) * CANVAS_HEIGHT : 100;

    const text = new fabric.IText(`{${campo}}`, {
      left,
      top,
      fontFamily: estilo?.fuente || 'Calibri',
      fontSize: estilo?.tamano || 11,
      fontWeight: estilo?.negrita ? 'bold' : 'normal',
      fontStyle: estilo?.italica ? 'italic' : 'normal',
      fill: '#0066cc',
      textAlign: estilo?.alineacion || 'left',
      editable: true,
    });

    (text as any).customId = `elem_${Date.now()}`;
    (text as any).customType = 'campo_bd';
    (text as any).customData = { campo_nombre: campo };

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !selectedObject) return;

    if ((selectedObject as any).excludeFromExport) return;

    canvas.remove(selectedObject);
    canvas.renderAll();
    setSelectedObject(null);
  };

  // ==================== HANDLERS ====================
  const handleCampoSelected = (campo: string, etiqueta?: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const startX = 100;
    const startY = 100;

    if (etiqueta) {
      const label = new fabric.Text(etiqueta, {
        left: startX,
        top: startY,
        fontFamily: 'Calibri',
        fontSize: 11,
        fill: '#000000',
        editable: false,
      });

      (label as any).customId = `elem_${Date.now()}_label`;
      (label as any).customType = 'texto_plano';
      canvas.add(label);

      const labelWidth = label.width || 0;
      const spacing = 5;

      const field = new fabric.IText(`{${campo}}`, {
        left: startX + labelWidth + spacing,
        top: startY,
        fontFamily: 'Calibri',
        fontSize: 11,
        fill: '#0066cc',
        editable: true,
      });

      (field as any).customId = `elem_${Date.now()}_campo`;
      (field as any).customType = 'campo_bd';
      (field as any).customData = { campo_nombre: campo };

      canvas.add(field);
      canvas.setActiveObject(field);
    } else {
      addCampoBD(campo);
    }

    canvas.renderAll();
  };

  const handleSave = () => saveMutation.mutate();

  const handleBack = () => navigate(-1);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleDebugMode = () => setDebugMode((prev) => !prev);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject && !(selectedObject as any).isEditing) {
        e.preventDefault();
        deleteSelected();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        toggleDebugMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject]);

  // ==================== RENDER ====================
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Drawer izquierdo */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => addTextoPlano()}>
                <ListItemIcon><TextFieldsIcon /></ListItemIcon>
                <ListItemText primary="Texto" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton onClick={() => setCampoSelectorOpen(true)}>
                <ListItemIcon><DataObjectIcon /></ListItemIcon>
                <ListItemText primary="Campo BD" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton disabled>
                <ListItemIcon><ImageIcon /></ListItemIcon>
                <ListItemText primary="Imagen" secondary="Próximamente" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton disabled>
                <ListItemIcon><QrCodeIcon /></ListItemIcon>
                <ListItemText primary="Código Barras" secondary="Próximamente" />
              </ListItemButton>
            </ListItem>

            <Divider />

            <ListItem disablePadding>
              <ListItemButton onClick={deleteSelected} disabled={!selectedObject}>
                <ListItemIcon><DeleteIcon /></ListItemIcon>
                <ListItemText primary="Eliminar" />
              </ListItemButton>
            </ListItem>

            <Divider />

            <ListItem disablePadding>
              <ListItemButton onClick={toggleDebugMode}>
                <ListItemIcon>
                  <BugReportIcon color={debugMode ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Debug" secondary={debugMode ? 'ON' : 'OFF'} />
              </ListItemButton>
            </ListItem>
          </List>

          <Box sx={{ p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" display="block" gutterBottom>
              <strong>Atajos:</strong>
            </Typography>
            <Typography variant="caption">Ctrl + S → Guardar</Typography>
            <Typography variant="caption">Delete → Eliminar</Typography>
            <Typography variant="caption">Ctrl + D → Debug</Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {plantilla?.nombre_plantilla || 'Editor de Plantilla'}
            </Typography>
            <Button
              color="inherit"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Typography variant="body1" sx={{ mx: 2 }}>
              {user?.nombre}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Salir
            </Button>
          </Toolbar>
        </AppBar>

        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
          <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
        </Snackbar>

        <Snackbar open={!!success} autoHideDuration={3000} onClose={() => setSuccess('')}>
          <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
        </Snackbar>

        {/* Área del canvas */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            backgroundColor: '#f5f5f5',
          }}
        >
          <Paper elevation={3} sx={{ p: 2 }}>
            <Box sx={{ mb: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                México Oficio: 21.59 cm × 34.01 cm ({CANVAS_WIDTH} × {CANVAS_HEIGHT} px @72dpi)
              </Typography>
              {debugMode && (
                <Typography variant="caption" display="block" color="primary">
                  🐛 DEBUG MODE ON
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                border: '1px solid #ddd',
                backgroundColor: '#fff',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              }}
            >
              <canvas ref={canvasRef} />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Panel derecho de propiedades */}
      {selectedObject && (
        <PropertiesPanel
          selectedObject={selectedObject}
          canvas={fabricCanvasRef.current!}
          onUpdate={() => fabricCanvasRef.current?.renderAll()}
        />
      )}

      {/* Selector de campos */}
      {plantilla && (
        <CampoSelector
          open={campoSelectorOpen}
          nombrePadron={plantilla.nombre_padron || ''}
          onClose={() => setCampoSelectorOpen(false)}
          onSelect={handleCampoSelected}
        />
      )}
    </Box>
  );
}