from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Plantilla(Base):
    __tablename__ = "plantillas"
    
    id_plantilla = Column(Integer, primary_key=True, index=True)
    uuid_plantilla = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    nombre_plantilla = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    uuid_proyecto = Column(UUID(as_uuid=True), ForeignKey("proyectos.uuid_proyecto", ondelete="CASCADE"), nullable=False)
    uuid_padron = Column(UUID(as_uuid=True), ForeignKey("identificador_padron.uuid_padron"), nullable=False)
    canvas_config = Column(JSONB, nullable=False)
    ancho_canvas = Column(Numeric(6, 2), default=21.59)
    alto_canvas = Column(Numeric(6, 2), default=34.01)
    thumbnail_path = Column(String(500), nullable=True)
    version = Column(Integer, default=1)
    is_deleted = Column(Boolean, default=False)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    updated_on = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Plantilla {self.nombre_plantilla}>"