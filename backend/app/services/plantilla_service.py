from sqlalchemy.orm import Session
from sqlalchemy import and_, text
from fastapi import HTTPException, status
from typing import List, Optional, Dict, Any
import uuid
import random

from app.models.plantilla import Plantilla
from app.models.proyecto import Proyecto
from app.models.padron import IdentificadorPadron
from app.models.usuario import Usuario
from app.schemas.plantilla import (
    PlantillaCreate, PlantillaUpdate, PlantillaResponse,
    CamposPadronResponse, PreviewDataResponse
)
from app.services.bitacora_service import BitacoraService

class PlantillaService:
    
    @staticmethod
    def get_all_by_proyecto(db: Session, proyecto_uuid: uuid.UUID) -> List[PlantillaResponse]:
        """Obtener todas las plantillas de un proyecto"""
        
        plantillas = db.query(Plantilla).filter(
            and_(
                Plantilla.uuid_proyecto == proyecto_uuid,
                Plantilla.is_deleted == False
            )
        ).all()
        
        result = []
        for plantilla in plantillas:
            # Obtener info del proyecto y padrón
            proyecto = db.query(Proyecto).filter(
                Proyecto.uuid_proyecto == plantilla.uuid_proyecto
            ).first()
            
            padron = db.query(IdentificadorPadron).filter(
                IdentificadorPadron.uuid_padron == plantilla.uuid_padron
            ).first()
            
            plantilla_dict = PlantillaResponse.model_validate(plantilla).__dict__
            plantilla_dict['nombre_proyecto'] = proyecto.nombre_proyecto if proyecto else None
            plantilla_dict['nombre_padron'] = padron.nombre_padron if padron else None
            
            result.append(PlantillaResponse(**plantilla_dict))
        
        return result
    
    @staticmethod
    def get_by_uuid(db: Session, plantilla_uuid: uuid.UUID) -> PlantillaResponse:
        """Obtener plantilla por UUID"""
        
        plantilla = db.query(Plantilla).filter(
            and_(
                Plantilla.uuid_plantilla == plantilla_uuid,
                Plantilla.is_deleted == False
            )
        ).first()
        
        if not plantilla:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla no encontrada"
            )
        
        # Obtener info del proyecto y padrón
        proyecto = db.query(Proyecto).filter(
            Proyecto.uuid_proyecto == plantilla.uuid_proyecto
        ).first()
        
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == plantilla.uuid_padron
        ).first()
        
        plantilla_dict = PlantillaResponse.model_validate(plantilla).__dict__
        plantilla_dict['nombre_proyecto'] = proyecto.nombre_proyecto if proyecto else None
        plantilla_dict['nombre_padron'] = padron.nombre_padron if padron else None
        
        return PlantillaResponse(**plantilla_dict)
    
    @staticmethod
    def create(
        db: Session,
        plantilla_data: PlantillaCreate,
        usuario: Usuario,
        ip_address: Optional[str] = None
    ) -> PlantillaResponse:
        """Crear nueva plantilla"""
        
        # Verificar que el proyecto existe
        proyecto = db.query(Proyecto).filter(
            and_(
                Proyecto.uuid_proyecto == plantilla_data.uuid_proyecto,
                Proyecto.is_deleted == False
            )
        ).first()
        
        if not proyecto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proyecto no encontrado"
            )
        
        # Verificar que el padrón existe
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == plantilla_data.uuid_padron
        ).first()
        
        if not padron:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Padrón no encontrado"
            )
        
        # Verificar que no exista una plantilla con el mismo nombre en el proyecto
        existing = db.query(Plantilla).filter(
            and_(
                Plantilla.nombre_plantilla == plantilla_data.nombre_plantilla,
                Plantilla.uuid_proyecto == plantilla_data.uuid_proyecto,
                Plantilla.is_deleted == False
            )
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una plantilla con ese nombre en este proyecto"
            )
        
        # Crear plantilla
        nueva_plantilla = Plantilla(
            nombre_plantilla=plantilla_data.nombre_plantilla,
            descripcion=plantilla_data.descripcion,
            uuid_proyecto=plantilla_data.uuid_proyecto,
            uuid_padron=plantilla_data.uuid_padron,
            canvas_config=plantilla_data.canvas_config.model_dump(),
            ancho_canvas=plantilla_data.ancho_canvas,
            alto_canvas=plantilla_data.alto_canvas,
            version=1,
            is_deleted=False
        )
        
        db.add(nueva_plantilla)
        db.commit()
        db.refresh(nueva_plantilla)
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="CREAR_PLANTILLA",
            entidad="PLANTILLA",
            entidad_id=str(nueva_plantilla.uuid_plantilla),
            detalles={
                "nombre": nueva_plantilla.nombre_plantilla,
                "proyecto": proyecto.nombre_proyecto
            },
            ip_address=ip_address
        )
        
        plantilla_dict = PlantillaResponse.model_validate(nueva_plantilla).__dict__
        plantilla_dict['nombre_proyecto'] = proyecto.nombre_proyecto
        plantilla_dict['nombre_padron'] = padron.nombre_padron
        
        return PlantillaResponse(**plantilla_dict)
    
    @staticmethod
    def update(
        db: Session,
        plantilla_uuid: uuid.UUID,
        plantilla_data: PlantillaUpdate,
        usuario: Usuario,
        ip_address: Optional[str] = None
    ) -> PlantillaResponse:
        """Actualizar plantilla"""
        
        plantilla = db.query(Plantilla).filter(
            and_(
                Plantilla.uuid_plantilla == plantilla_uuid,
                Plantilla.is_deleted == False
            )
        ).first()
        
        if not plantilla:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla no encontrada"
            )
        
        # Actualizar campos
        update_data = plantilla_data.model_dump(exclude_unset=True)
        
        # Si se actualiza canvas_config, incrementar versión
        if 'canvas_config' in update_data:
            plantilla.version += 1
            #update_data['canvas_config'] = update_data['canvas_config'].model_dump()
        
        for field, value in update_data.items():
            setattr(plantilla, field, value)
        
        db.commit()
        db.refresh(plantilla)
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="EDITAR_PLANTILLA",
            entidad="PLANTILLA",
            entidad_id=str(plantilla.uuid_plantilla),
            detalles={"cambios": list(update_data.keys())},
            ip_address=ip_address
        )
        
        return PlantillaService.get_by_uuid(db, plantilla_uuid)
    
    @staticmethod
    def delete(
        db: Session,
        plantilla_uuid: uuid.UUID,
        usuario: Usuario,
        ip_address: Optional[str] = None
    ) -> dict:
        """Eliminar plantilla (soft delete)"""
        
        plantilla = db.query(Plantilla).filter(
            and_(
                Plantilla.uuid_plantilla == plantilla_uuid,
                Plantilla.is_deleted == False
            )
        ).first()
        
        if not plantilla:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla no encontrada"
            )
        
        # Soft delete
        plantilla.is_deleted = True
        db.commit()
        
        # Registrar en bitácora
        BitacoraService.registrar(
            db=db,
            uuid_usuario=usuario.uuid_usuario,
            accion="ELIMINAR_PLANTILLA",
            entidad="PLANTILLA",
            entidad_id=str(plantilla.uuid_plantilla),
            detalles={"nombre": plantilla.nombre_plantilla},
            ip_address=ip_address
        )
        
        return {"message": "Plantilla eliminada exitosamente"}
    
    @staticmethod
    def get_campos_padron(db: Session, nombre_padron: str) -> List[CamposPadronResponse]:
        """Obtener columnas disponibles de un padrón"""
        
        # Mapear nombre de padrón a nombre de tabla
        tabla_map = {
            "TLAJOMULCO_APA": "padron_completo_tlajomulco_apa",
            "TLAJOMULCO_PREDIAL": "padron_completo_tlajomulco_predial",
            "GUADALAJARA_PREDIAL": "padron_completo_guadalajara_predial_principal",
            "GUADALAJARA_LICENCIAS": "padron_completo_guadalajara_licencias_principal",
            "PENSIONES": "padron_completo_pensiones"
        }
        
        tabla_nombre = tabla_map.get(nombre_padron)
        
        if not tabla_nombre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Padrón no reconocido: {nombre_padron}"
            )
        
        # Obtener columnas de la tabla
        query = text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = :tabla_nombre
            AND column_name NOT IN ('uuid_padron', 'uuid_proyecto', 'id_proyecto')
            ORDER BY ordinal_position
        """)
        
        result = db.execute(query, {"tabla_nombre": tabla_nombre})
        columnas = result.fetchall()
        
        return [
            CamposPadronResponse(nombre_columna=col[0], tipo_dato=col[1])
            for col in columnas
        ]
    
    @staticmethod
    def get_preview_data(
        db: Session,
        plantilla_uuid: uuid.UUID
    ) -> PreviewDataResponse:
        """Obtener datos aleatorios del padrón para preview"""
        
        plantilla = db.query(Plantilla).filter(
            Plantilla.uuid_plantilla == plantilla_uuid
        ).first()
        
        if not plantilla:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla no encontrada"
            )
        
        # Obtener el padrón
        padron = db.query(IdentificadorPadron).filter(
            IdentificadorPadron.uuid_padron == plantilla.uuid_padron
        ).first()
        
        if not padron:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Padrón no encontrado"
            )
        
        # Mapear a tabla
        tabla_map = {
            "TLAJOMULCO_APA": "padron_completo_tlajomulco_apa",
            "TLAJOMULCO_PREDIAL": "padron_completo_tlajomulco_predial",
            "GUADALAJARA_PREDIAL": "padron_completo_guadalajara_predial_principal",
            "GUADALAJARA_LICENCIAS": "padron_completo_guadalajara_licencias_principal",
            "PENSIONES": "padron_completo_pensiones"
        }
        
        tabla_nombre = tabla_map.get(padron.nombre_padron)
        
        if not tabla_nombre:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al mapear padrón"
            )
        
        # Obtener registro aleatorio
        query = text(f"""
            SELECT *
            FROM {tabla_nombre}
            WHERE uuid_proyecto = :uuid_proyecto
            ORDER BY RANDOM()
            LIMIT 1
        """)
        
        result = db.execute(query, {"uuid_proyecto": str(plantilla.uuid_proyecto)})
        row = result.fetchone()
        
        if not row:
            return PreviewDataResponse(
                datos={},
                mensaje="No hay datos en el padrón para este proyecto"
            )
        
        # Convertir a diccionario
        datos = dict(row._mapping)
        
        # Convertir UUID y datetime a string
        for key, value in datos.items():
            if isinstance(value, uuid.UUID):
                datos[key] = str(value)
            elif hasattr(value, 'isoformat'):
                datos[key] = value.isoformat()
        
        return PreviewDataResponse(datos=datos)