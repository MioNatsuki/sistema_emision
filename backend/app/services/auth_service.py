from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Optional

from app.models.usuario import Usuario
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.auth import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.core.config import settings
from app.services.bitacora_service import BitacoraService

class AuthService:
    
    @staticmethod
    def authenticate_user(db: Session, login_data: LoginRequest, ip_address: str = None) -> TokenResponse:
        """Autenticar usuario y generar token"""
        

        user = db.query(Usuario).filter(
            (Usuario.username == login_data.username) | 
            (Usuario.email == login_data.username)
        ).first()
        
        if not user:
            # Registrar intento fallido
            BitacoraService.registrar(
                db=db,
                uuid_usuario=None,
                accion="LOGIN_FALLIDO",
                entidad="USUARIO",
                entidad_id=login_data.username,
                detalles={"motivo": "Usuario no encontrado"},
                ip_address=ip_address,
                fue_exitoso=False
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )
        
        # Verificar si está bloqueado
        if user.bloqueado_hasta and user.bloqueado_hasta > datetime.utcnow():
            tiempo_restante = (user.bloqueado_hasta - datetime.utcnow()).seconds // 60
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Usuario bloqueado. Intente nuevamente en {tiempo_restante} minutos"
            )
        
        # Verificar contraseña
        if not verify_password(login_data.password, user.contrasena):
            AuthService._manejar_intento_fallido(db, user)
            
            # Registrar en bitácora
            BitacoraService.registrar(
                db=db,
                uuid_usuario=user.uuid_usuario,
                accion="LOGIN_FALLIDO",
                entidad="USUARIO",
                entidad_id=str(user.uuid_usuario),
                detalles={"motivo": "Contraseña incorrecta"},
                ip_address=ip_address,
                fue_exitoso=False
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )
        
        # Verificar que esté activo
        if not user.is_active or user.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo o eliminado"
            )
        
        # Resetear intentos fallidos
        user.intentos_login_fallidos = 0
        user.bloqueado_hasta = None
        user.last_login = datetime.utcnow()
        db.commit()
        
        # Crear token JWT
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username},
            expires_delta=access_token_expires
        )
        
        BitacoraService.registrar(
            db=db,
            uuid_usuario=user.uuid_usuario,
            accion="LOGIN_EXITOSO",
            entidad="USUARIO",
            entidad_id=str(user.uuid_usuario),
            detalles={"username": user.username},
            ip_address=ip_address,
            fue_exitoso=True
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )
    
    @staticmethod
    def _manejar_intento_fallido(db: Session, user: Usuario):
        """Manejar intento de login fallido"""
        user.intentos_login_fallidos += 1
        user.ultimo_intento_login = datetime.utcnow()
        
        # Bloquear después de 5 intentos
        if user.intentos_login_fallidos >= 5:
            user.bloqueado_hasta = datetime.utcnow() + timedelta(minutes=15)
        
        db.commit()
    
    @staticmethod
    def get_current_user_info(user: Usuario) -> UserResponse:
        """Obtener información del usuario actual"""
        return UserResponse.model_validate(user)
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> UserResponse:
        """Crear nuevo usuario"""
        
        # Verificar que username no exista
        existing_user = db.query(Usuario).filter(Usuario.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El username ya está en uso"
            )
        
        # Verificar que email no exista
        existing_email = db.query(Usuario).filter(Usuario.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está en uso"
            )
        
        # Crear usuario
        new_user = Usuario(
            nombre=user_data.nombre,
            apellido=user_data.apellido,
            username=user_data.username,
            email=user_data.email,
            contrasena=get_password_hash(user_data.password),
            is_active=True,
            is_deleted=False
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Registrar en bitácora (lo haremos después)
        
        return UserResponse.model_validate(new_user)