from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Proyecto(Base):
    __tablename__ = "proyectos"
    
    id_proyecto = Column(Integer, primary_key=True, index=True)
    uuid_proyecto = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False, index=True)
    nombre_proyecto = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    logo_proyecto = Column(String(500), nullable=True)
    uuid_padron = Column(UUID(as_uuid=True), ForeignKey("identificador_padron.uuid_padron"), nullable=False)
    usuario_creador = Column(UUID(as_uuid=True), ForeignKey("usuarios.uuid_usuario"), nullable=False)
    en_emision = Column(Boolean, default=False)
    created_on = Column(DateTime(timezone=True), server_default=func.now())
    updated_on = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted = Column(Boolean, default=False)
    
    def __repr__(self):
        return f"<Proyecto {self.nombre_proyecto}>"