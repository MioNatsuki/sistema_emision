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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import DataObjectIcon from '@mui/icons-material/DataObject';
import ImageIcon from '@mui/icons-material/Image';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DeleteIcon from '@mui/icons-material/Delete';

import { plantillasService } from '@/services/plantillas.service';
import { useAuthStore } from '@/store/authStore';
import PropertiesPanel from '@/components/plantillas/PropertiesPanel';
import CampoSelector from '@/components/plantillas/CampoSelector';

const DRAWER_WIDTH = 240;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 1600;

export default function PlantillaEditor() {
  const { plantillaId } = useParams<{ plantillaId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [campoSelectorOpen, setCampoSelectorOpen] = useState(false);

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
      return plantillasService.update(plantillaId!, {
        canvas_config: canvasData,
      });
    },
    onSuccess: () => {
      setSuccess('Plantilla guardada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Error al guardar plantilla');
    },
  });

  // Inicializar canvas - UNA SOLA VEZ
  useEffect(() => {
    if (!canvasRef.current) return;
    if (fabricCanvas) return; // Ya existe
    
    console.log('Inicializando canvas...');

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#FFFFFF',
      selection: true,
      preserveObjectStacking: true,
    });

    // Grid de fondo
    const gridSize = 50;
    const gridLines: fabric.Line[] = [];
    
    for (let i = 0; i < CANVAS_WIDTH / gridSize; i++) {
      gridLines.push(new fabric.Line([i * gridSize, 0, i * gridSize, CANVAS_HEIGHT], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      }));
    }
    
    for (let i = 0; i < CANVAS_HEIGHT / gridSize; i++) {
      gridLines.push(new fabric.Line([0, i * gridSize, CANVAS_WIDTH, i * gridSize], {
        stroke: '#e0e0e0',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
      }));
    }
    
    canvas.add(...gridLines);
    canvas.sendObjectToBack(gridLines[0]);

    // Event listeners
    canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => setSelectedObject(null));

    canvas.renderAll();
    setFabricCanvas(canvas);
    console.log('Canvas listo');

    return () => {
      canvas.dispose();
    };
  }, []); // SIN DEPENDENCIAS - solo se ejecuta una vez

  // Cargar configuración de la plantilla
  useEffect(() => {
    if (!fabricCanvas || !plantilla) return;
    console.log('Cargando configuración...');
    loadCanvasConfig(plantilla.canvas_config);
  }, [fabricCanvas, plantilla]);

  const loadCanvasConfig = (config: any) => {
    if (!fabricCanvas) return;

    // Limpiar solo objetos editables
    const objects = fabricCanvas.getObjects().filter(obj => obj.selectable !== false);
    objects.forEach(obj => fabricCanvas.remove(obj));

    // Cargar elementos
    config.elementos?.forEach((elemento: any) => {
      try {
        if (elemento.tipo === 'texto_plano') {
          addTextoPlano(elemento.contenido || 'Texto', elemento.x, elemento.y, elemento.estilo, false);
        } else if (elemento.tipo === 'campo_bd') {
          addCampoBD(elemento.campo_nombre || 'campo', elemento.x, elemento.y, elemento.estilo, false);
        }
      } catch (err) {
        console.error('Error cargando elemento:', err);
      }
    });

    fabricCanvas.renderAll();
  };

  const exportCanvasConfig = () => {
    if (!fabricCanvas) return { elementos: [] };
    
    const elementos = fabricCanvas.getObjects()
      .filter((obj) => obj.selectable !== false)
      .map((obj) => {
        const commonProps = {
          id: (obj as any).customId || `elem_${Date.now()}`,
          x: (obj.left! / CANVAS_WIDTH) * 21.59,
          y: (obj.top! / CANVAS_HEIGHT) * 34.01,
          ancho: ((obj.width || 0) * (obj.scaleX || 1) / CANVAS_WIDTH) * 21.59,
          alto: ((obj.height || 0) * (obj.scaleY || 1) / CANVAS_HEIGHT) * 34.01,
        };

        if (obj instanceof fabric.IText || obj instanceof fabric.Text) {
          return {
            ...commonProps,
            tipo: (obj as any).customType || 'texto_plano',
            contenido: obj.text || '',
            campo_nombre: (obj as any).customData?.campo_nombre,
            estilo: {
              fuente: obj.fontFamily,
              tamano: obj.fontSize,
              negrita: obj.fontWeight === 'bold',
              italica: obj.fontStyle === 'italic',
              color: obj.fill?.toString() || '#000000',
              alineacion: obj.textAlign || 'left',
            },
            ...(obj as any).customData || {},
          };
        }
        return commonProps;
      });

    return { 
      elementos, 
      configuracion_global: { 
        color_fondo: '#FFFFFF',
        margen_superior: 1.0,
        margen_inferior: 1.0,
        margen_izquierdo: 1.0,
        margen_derecho: 1.0,
      } 
    };
  };

  // ============ FUNCIONES DE AGREGADO ============
  // IMPORTANTE: Las funciones deben ser estables y no recrearse en cada render
  
  const addTextoPlano = (texto: string = 'Texto', x?: number, y?: number, estilo?: any, setActive: boolean = true) => {
    if (!fabricCanvas) {
      console.error('Canvas no disponible');
      return;
    }

    console.log('Agregando texto plano:', texto);
    
    const left = x !== undefined ? (x / 21.59) * CANVAS_WIDTH : 200;
    const top = y !== undefined ? (y / 34.01) * CANVAS_HEIGHT : 200;

    try {
      const text = new fabric.IText(texto, {
        left,
        top,
        fontFamily: estilo?.fuente || 'Calibri',
        fontSize: estilo?.tamano || 24,
        fontWeight: estilo?.negrita ? 'bold' : 'normal',
        fontStyle: estilo?.italica ? 'italic' : 'normal',
        fill: estilo?.color || '#000000',
        textAlign: estilo?.alineacion || 'left',
      });

      (text as any).customId = `text_${Date.now()}`;
      (text as any).customType = 'texto_plano';

      fabricCanvas.add(text);
      
      if (setActive) {
        fabricCanvas.setActiveObject(text);
        setSelectedObject(text);
      }
      
      fabricCanvas.renderAll();
      console.log('Texto agregado');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const addCampoBD = (campo: string, x?: number, y?: number, estilo?: any, setActive: boolean = true) => {
    if (!fabricCanvas) {
      console.error('Canvas no disponible');
      return;
    }

    console.log('Agregando campo BD:', campo);
    
    const left = x !== undefined ? (x / 21.59) * CANVAS_WIDTH : 200;
    const top = y !== undefined ? (y / 34.01) * CANVAS_HEIGHT : 300;

    try {
      const text = new fabric.IText(`{${campo}}`, {
        left,
        top,
        fontFamily: estilo?.fuente || 'Calibri',
        fontSize: estilo?.tamano || 24,
        fontWeight: estilo?.negrita ? 'bold' : 'bold',
        fontStyle: estilo?.italica ? 'italic' : 'normal',
        fill: estilo?.color || '#0066cc',
        textAlign: estilo?.alineacion || 'left',
      });

      (text as any).customId = `campo_${Date.now()}`;
      (text as any).customType = 'campo_bd';
      (text as any).customData = { campo_nombre: campo };

      fabricCanvas.add(text);
      
      if (setActive) {
        fabricCanvas.setActiveObject(text);
        setSelectedObject(text);
      }
      
      fabricCanvas.renderAll();
      console.log('Campo BD agregado');
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleCampoSelected = (campo: string, etiqueta?: string) => {
    if (!fabricCanvas) return;
    
    console.log('Campo seleccionado:', campo);
    
    if (etiqueta) {
      addTextoPlano(etiqueta, undefined, undefined, undefined, false);
      setTimeout(() => {
        addCampoBD(campo, undefined, undefined, undefined, true);
      }, 50);
    } else {
      addCampoBD(campo);
    }
    
    setCampoSelectorOpen(false);
  };

  const deleteSelected = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    setSelectedObject(null);
  };

  const handleSave = () => saveMutation.mutate();
  const handleBack = () => navigate(-1);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ============ TOOLBAR CON ListItemButton ============ */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            position: 'relative',
            height: '100vh',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', p: 1 }}>
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
            Elementos
          </Typography>

          <List disablePadding>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                onClick={() => addTextoPlano()}
                disabled={!fabricCanvas}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon>
                  <TextFieldsIcon />
                </ListItemIcon>
                <ListItemText primary="Texto Plano" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton 
                onClick={() => setCampoSelectorOpen(true)}
                disabled={!fabricCanvas}
                sx={{ borderRadius: 1 }}
              >
                <ListItemIcon>
                  <DataObjectIcon />
                </ListItemIcon>
                <ListItemText primary="Campo de BD" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton disabled sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <ImageIcon />
                </ListItemIcon>
                <ListItemText primary="Imagen" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton disabled sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <QrCodeIcon />
                </ListItemIcon>
                <ListItemText primary="Código de barras" />
              </ListItemButton>
            </ListItem>
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
            Acciones
          </Typography>

          <List disablePadding>
            <ListItem disablePadding>
              <ListItemButton 
                onClick={deleteSelected}
                disabled={!selectedObject}
                sx={{ 
                  borderRadius: 1,
                  color: !selectedObject ? 'text.disabled' : 'error.main',
                }}
              >
                <ListItemIcon>
                  <DeleteIcon color={selectedObject ? 'error' : 'disabled'} />
                </ListItemIcon>
                <ListItemText primary="Eliminar" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Área principal (sin cambios) */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <IconButton color="inherit" onClick={handleBack} edge="start" sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {plantilla?.nombre_plantilla || 'Editor de Plantilla'}
            </Typography>
            <Button
              color="primary"
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveMutation.isPending}
              sx={{ mr: 2 }}
            >
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
              {user?.nombre}
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Salir
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ px: 3, pt: 2 }}>
          {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>{success}</Alert>}
        </Box>

        <Box
          ref={containerRef}
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            p: 3,
          }}
        >
          <Paper elevation={4} sx={{ display: 'inline-block' }}>
            <canvas 
              ref={canvasRef} 
              style={{
                display: 'block',
                width: `${CANVAS_WIDTH}px`,
                height: `${CANVAS_HEIGHT}px`,
                border: '1px solid #ccc',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              }} 
            />
          </Paper>
        </Box>
      </Box>

      {selectedObject && fabricCanvas && (
        <PropertiesPanel
          selectedObject={selectedObject}
          canvas={fabricCanvas}
          onUpdate={() => fabricCanvas.renderAll()}
        />
      )}

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