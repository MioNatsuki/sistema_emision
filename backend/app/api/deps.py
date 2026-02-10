from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Generator
from datetime import datetime

from app.core.database import SessionLocal
from app.core.security import decode_access_token
from app.models.usuario import Usuario

# Security scheme
security = HTTPBearer()

def get_db() -> Generator:
    """Dependency para obtener sesión de BD"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtener usuario actual desde token JWT"""
    
    # Debug: ver qué llega
    print(f"🔍 [AUTH] Credentials recibidas: {credentials}")
    print(f"🔍 [AUTH] Scheme: {credentials.scheme}")
    print(f"🔍 [AUTH] Token: {credentials.credentials[:30]}..." if credentials.credentials else "❌ NO HAY TOKEN")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        print("❌ [AUTH] Token inválido o expirado")
        raise credentials_exception
    
    username: str = payload.get("sub")
    if username is None:
        print("❌ [AUTH] No 'sub' en payload")
        raise credentials_exception
    
    print(f"✅ [AUTH] Username extraído: {username}")
    
    # Buscar usuario en BD
    user = db.query(Usuario).filter(Usuario.username == username).first()
    
    if user is None:
        print(f"❌ [AUTH] Usuario '{username}' no encontrado")
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    
    if user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario eliminado"
        )
    
    # Verificar si está bloqueado
    if user.bloqueado_hasta and user.bloqueado_hasta > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Usuario bloqueado hasta {user.bloqueado_hasta}"
        )
    
    print(f"✅ [AUTH] Usuario autenticado: {username}")
    return user

async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Verificar que el usuario esté activo"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )
    return current_user