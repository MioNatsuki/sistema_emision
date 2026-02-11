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

// Canvas más grande para mejor edición (escala 2x del tamaño real)
const SCALE_FACTOR = 2.5; // Multiplicador para hacer el canvas más grande y cómodo
const CANVAS_WIDTH = 816 * SCALE_FACTOR; // 21.59cm escalado
const CANVAS_HEIGHT = 1286 * SCALE_FACTOR; // 34.01cm escalado

export default function PlantillaEditor() {
  const { plantillaId } = useParams<{ plantillaId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Inicializar canvas
  useEffect(() => {
    if (!canvasRef.current || fabricCanvas) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#FFFFFF',
    });

    // Grid de fondo más fino
    const gridSize = 25 * SCALE_FACTOR;
    for (let i = 0; i < CANVAS_WIDTH / gridSize; i++) {
      canvas.add(new fabric.Line([i * gridSize, 0, i * gridSize, CANVAS_HEIGHT], {
        stroke: '#e0e0e0',
        selectable: false,
        evented: false,
      }));
    }
    for (let i = 0; i < CANVAS_HEIGHT / gridSize; i++) {
      canvas.add(new fabric.Line([0, i * gridSize, CANVAS_WIDTH, i * gridSize], {
        stroke: '#e0e0e0',
        selectable: false,
        evented: false,
      }));
    }

    // Event listeners
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Cargar configuración de la plantilla
  useEffect(() => {
    if (!fabricCanvas || !plantilla) return;

    loadCanvasConfig(plantilla.canvas_config);
  }, [fabricCanvas, plantilla]);

  const loadCanvasConfig = (config: any) => {
    if (!fabricCanvas) return;

    // Limpiar canvas (excepto grid)
    const objects = fabricCanvas.getObjects();
    objects.forEach((obj: fabric.Object) => {
      if (obj.selectable !== false) {
        fabricCanvas.remove(obj);
      }
    });

    // Cargar elementos
    config.elementos?.forEach((elemento: any) => {
      switch (elemento.tipo) {
        case 'texto_plano':
          addTextoPlano(elemento.contenido, elemento.x, elemento.y, elemento.estilo, false);
          break;
        case 'campo_bd':
          addCampoBD(elemento.campo_nombre, elemento.x, elemento.y, elemento.estilo, false);
          break;
        // Agregar más tipos después
      }
    });

    fabricCanvas.renderAll();
  };

  const exportCanvasConfig = () => {
    if (!fabricCanvas) return { elementos: [] };

    const elementos = fabricCanvas.getObjects()
      .filter((obj: fabric.Object) => obj.selectable !== false)
      .map((obj: fabric.Object) => {
        const commonProps = {
          id: (obj as any).customId || `elem_${Date.now()}`,
          // Convertir de coordenadas del canvas escalado a cm del documento real
          x: (obj.left! / CANVAS_WIDTH) * 21.59,
          y: (obj.top! / CANVAS_HEIGHT) * 34.01,
          ancho: (obj.width! * (obj.scaleX || 1) / CANVAS_WIDTH) * 21.59,
          alto: (obj.height! * (obj.scaleY || 1) / CANVAS_HEIGHT) * 34.01,
        };

        if (obj.type === 'text' || obj.type === 'i-text') {
          const textObj = obj as fabric.Text;
          return {
            ...commonProps,
            tipo: (obj as any).customType || 'texto_plano',
            contenido: textObj.text || '',
            estilo: {
              fuente: textObj.fontFamily || 'Calibri',
              tamano: textObj.fontSize || 11,
              negrita: textObj.fontWeight === 'bold',
              italica: textObj.fontStyle === 'italic',
              color: textObj.fill?.toString() || '#000000',
              alineacion: textObj.textAlign || 'left',
            },
            ...(obj as any).customData || {},
          };
        }

        return commonProps;
      });

    return {
      elementos,
      configuracion_global: {
        margen_superior: 1.0,
        margen_inferior: 1.0,
        margen_izquierdo: 1.0,
        margen_derecho: 1.0,
        color_fondo: '#FFFFFF',
      },
    };
  };

  const addTextoPlano = (texto: string = 'Texto', x?: number, y?: number, estilo?: any, setActive: boolean = true) => {
    if (!fabricCanvas) return;

    // Convertir coordenadas de cm a píxeles del canvas escalado (si se proporcionan)
    const left = x ? (x / 21.59) * CANVAS_WIDTH : 100;
    const top = y ? (y / 34.01) * CANVAS_HEIGHT : 100;

    const text = new fabric.IText(texto, {
      left,
      top,
      fontFamily: estilo?.fuente || 'Calibri',
      fontSize: (estilo?.tamano || 11) * SCALE_FACTOR, // Escalar el tamaño de fuente
      fontWeight: estilo?.negrita ? 'bold' : 'normal',
      fontStyle: estilo?.italica ? 'italic' : 'normal',
      fill: estilo?.color || '#000000',
      textAlign: estilo?.alineacion || 'left',
    });

    (text as any).customId = `elem_${Date.now()}`;
    (text as any).customType = 'texto_plano';

    fabricCanvas.add(text);
    if (setActive) {
      fabricCanvas.setActiveObject(text);
    }
    fabricCanvas.renderAll();
  };

  const addCampoBD = (campo: string, x?: number, y?: number, estilo?: any, setActive: boolean = true) => {
    if (!fabricCanvas) return;

    // Convertir coordenadas de cm a píxeles del canvas escalado (si se proporcionan)
    const left = x ? (x / 21.59) * CANVAS_WIDTH : 100;
    const top = y ? (y / 34.01) * CANVAS_HEIGHT : 100;

    const text = new fabric.IText(`{${campo}}`, {
      left,
      top,
      fontFamily: estilo?.fuente || 'Calibri',
      fontSize: (estilo?.tamano || 11) * SCALE_FACTOR, // Escalar el tamaño de fuente
      fontWeight: estilo?.negrita ? 'bold' : 'normal',
      fontStyle: estilo?.italica ? 'italic' : 'normal',
      fill: '#0066cc',
      textAlign: estilo?.alineacion || 'left',
    });

    (text as any).customId = `elem_${Date.now()}`;
    (text as any).customType = 'campo_bd';
    (text as any).customData = { campo_nombre: campo };

    fabricCanvas.add(text);
    if (setActive) {
      fabricCanvas.setActiveObject(text);
    }
    fabricCanvas.renderAll();
  };

  const handleCampoSelected = (campo: string, etiqueta?: string) => {
    if (!fabricCanvas) return;

    // Si tiene etiqueta, crear dos elementos: etiqueta + campo
    if (etiqueta) {
      // Crear etiqueta (texto plano)
      const labelText = new fabric.Text(etiqueta, {
        left: 100,
        top: 100,
        fontFamily: 'Calibri',
        fontSize: 11 * SCALE_FACTOR,
        fill: '#000000',
      });

      (labelText as any).customId = `elem_${Date.now()}_label`;
      (labelText as any).customType = 'texto_plano';

      fabricCanvas.add(labelText);

      // Calcular posición del campo (justo después de la etiqueta)
      const labelWidth = labelText.width || 0;
      
      addCampoBD(
        campo, 
        ((100 + labelWidth + 5) / CANVAS_WIDTH) * 21.59, 
        (100 / CANVAS_HEIGHT) * 34.01
      );
    } else {
      // Solo agregar el campo
      addCampoBD(campo);
    }
    
    // Cerrar selector
    setCampoSelectorOpen(false);
  };

  const deleteSelected = () => {
    if (!fabricCanvas || !selectedObject) return;

    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    setSelectedObject(null);
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderListItem = (onClick: () => void, icon: React.ReactNode, text: string, disabled?: boolean) => (
    <ListItem 
      component="button" 
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: 'flex',
        textAlign: 'left',
        textTransform: 'none',
        width: '100%',
        border: 'none',
        background: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        '&:hover': disabled ? {} : { bgcolor: 'action.hover' },
      }}
    >
      <ListItemIcon sx={{ minWidth: 40 }}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={text} />
    </ListItem>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar lateral */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {renderListItem(() => addTextoPlano(), <TextFieldsIcon />, "Texto")}
            {renderListItem(() => setCampoSelectorOpen(true), <DataObjectIcon />, "Campo BD")}
            {renderListItem(() => {}, <ImageIcon />, "Imagen", true)}
            {renderListItem(() => {}, <QrCodeIcon />, "Código Barras", true)}
            <Divider />
            {renderListItem(deleteSelected, <DeleteIcon />, "Eliminar", !selectedObject)}
          </List>
        </Box>
      </Drawer>

      {/* Área principal */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <AppBar position="static">
          <Toolbar>
            <IconButton color="inherit" onClick={handleBack} sx={{ mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
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

        {/* Mensajes */}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess('')} sx={{ m: 2 }}>
            {success}
          </Alert>
        )}

        {/* Canvas */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            p: 2,
            backgroundColor: '#f5f5f5',
          }}
        >
          <Paper elevation={3} sx={{ display: 'inline-block' }}>
            <canvas ref={canvasRef} />
          </Paper>
        </Box>
      </Box>

      {/* Panel de propiedades */}
      {selectedObject && (
        <PropertiesPanel
          selectedObject={selectedObject}
          canvas={fabricCanvas}
          onUpdate={() => fabricCanvas?.renderAll()}
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