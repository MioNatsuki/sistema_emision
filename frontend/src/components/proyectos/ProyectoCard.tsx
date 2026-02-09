import { useState } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FolderIcon from '@mui/icons-material/Folder';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

import { Proyecto } from '@/types/proyecto.types';
import EditarProyectoModal from './EditarProyectoModal';
import EliminarProyectoDialog from './EliminarProyectoDialog';

interface ProyectoCardProps {
  proyecto: Proyecto;
  onUpdate: () => void;
}

export default function ProyectoCard({ proyecto, onUpdate }: ProyectoCardProps) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCardClick = () => {
    navigate(`/proyecto/${proyecto.uuid_proyecto}/menu`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMenuClose();
    setEditModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
        onClick={handleCardClick}
      >
        {/* Logo o icono */}
        {proyecto.logo_proyecto ? (
          <CardMedia
            component="img"
            height="140"
            image={`http://localhost:8000${proyecto.logo_proyecto}`}
            alt={proyecto.nombre_proyecto}
            sx={{ objectFit: 'contain', p: 2, bgcolor: 'background.default' }}
          />
        ) : (
          <Box
            sx={{
              height: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'white',
            }}
          >
            <FolderIcon sx={{ fontSize: 60 }} />
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="h6" component="div" noWrap sx={{ flexGrow: 1, pr: 1 }}>
              {proyecto.nombre_proyecto}
            </Typography>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ mt: -1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            {proyecto.descripcion || 'Sin descripción'}
          </Typography>

          <Chip
            label={proyecto.nombre_padron || 'Padrón'}
            size="small"
            color="primary"
            variant="outlined"
          />

          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 2 }}>
            Creado: {new Date(proyecto.created_on).toLocaleDateString()}
          </Typography>
        </CardContent>
      </Card>

      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Modal de edición */}
      <EditarProyectoModal
        open={editModalOpen}
        proyecto={proyecto}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setEditModalOpen(false);
          onUpdate();
        }}
      />

      {/* Dialog de eliminación */}
      <EliminarProyectoDialog
        open={deleteDialogOpen}
        proyecto={proyecto}
        onClose={() => setDeleteDialogOpen(false)}
        onSuccess={() => {
          setDeleteDialogOpen(false);
          onUpdate();
        }}
      />
    </>
  );
}