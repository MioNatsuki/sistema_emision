from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse, UserCreate
from app.services.auth_service import AuthService
from app.models.usuario import Usuario

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Endpoint de login
    
    - Valida credenciales
    - Verifica si está bloqueado
    - Genera token JWT
    - Registra en bitácora
    """
    ip_address = request.client.host
    return AuthService.authenticate_user(db, login_data, ip_address)

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Obtener información del usuario actual
    """
    return AuthService.get_current_user_info(current_user)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Registrar nuevo usuario
    
    - Valida que username y email sean únicos
    - Hashea la contraseña
    - Crea el usuario
    """
    return AuthService.create_user(db, user_data)

@router.post("/logout")
async def logout(
    current_user: Usuario = Depends(get_current_active_user)
):
    """
    Logout (el token simplemente expira del lado del cliente)
    """
    # Registrar en bitácora (lo haremos después)
    return {"message": "Logout exitoso"}