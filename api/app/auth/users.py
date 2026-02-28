from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt

from app.config import get_settings
from app.auth.schemas import (
    UserCreate,
    UserRead,
    UserUpdate,
    Token,
    TokenPayload,
    LoginRequest,
)
from app.auth import db as user_db

router = APIRouter()
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(
        plain_password.encode(), hashed_password.encode()
    )


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return bcrypt.hashpw(
        password.encode(), bcrypt.gensalt()
    ).decode()


def create_access_token(user_id: int) -> str:
    """Create an access token."""
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "access",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(user_id: int) -> str:
    """Create a refresh token."""
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Optional[TokenPayload]:
    """Decode and validate a JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return TokenPayload(
            sub=int(payload["sub"]),
            exp=datetime.fromtimestamp(payload["exp"]),
            type=payload["type"],
        )
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserRead:
    """Get the current authenticated user from the JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_payload = decode_token(credentials.credentials)
    if token_payload is None or token_payload.type != "access":
        raise credentials_exception

    user = user_db.get_user_by_id(token_payload.sub)
    if user is None:
        raise credentials_exception

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return UserRead(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
    )


# Valid invite tokens for registration
VALID_INVITE_TOKENS = {"b89c7ef625663c6d6e7d4e76dedb6d3e"}


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Validate invite token
    if user_data.invite_token not in VALID_INVITE_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid invite token",
        )

    # Check if username exists
    existing = user_db.get_user_by_username(user_data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Check if email exists (if provided)
    if user_data.email:
        existing_email = user_db.get_user_by_email(user_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    # Create user
    password_hash = get_password_hash(user_data.password)
    user = user_db.create_user(user_data.username, user_data.email, password_hash)

    return UserRead(
        id=user["id"],
        username=user["username"],
        email=user.get("email"),
        created_at=user["created_at"],
        is_active=user.get("is_active", True),
    )


@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    """Login and get access/refresh tokens."""
    user = user_db.get_user_by_username(login_data.username)

    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return Token(
        access_token=create_access_token(user["id"]),
        refresh_token=create_refresh_token(user["id"]),
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get new access token using refresh token."""
    token_payload = decode_token(credentials.credentials)

    if token_payload is None or token_payload.type != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = user_db.get_user_by_id(token_payload.sub)
    if not user or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return Token(
        access_token=create_access_token(user["id"]),
        refresh_token=create_refresh_token(user["id"]),
    )


@router.get("/me", response_model=UserRead)
async def get_me(current_user: UserRead = Depends(get_current_user)):
    """Get current user info."""
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_me(
    updates: UserUpdate,
    current_user: UserRead = Depends(get_current_user),
):
    """Update current user info."""
    update_data = {}

    if updates.username is not None:
        # Check if username is taken
        existing = user_db.get_user_by_username(updates.username)
        if existing and existing["id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken",
            )
        update_data["username"] = updates.username

    if updates.email is not None:
        existing = user_db.get_user_by_email(updates.email)
        if existing and existing["id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        update_data["email"] = updates.email

    if updates.password is not None:
        update_data["password_hash"] = get_password_hash(updates.password)

    if update_data:
        user = user_db.update_user(current_user.id, update_data)
        return UserRead(
            id=user["id"],
            username=user["username"],
            email=user.get("email"),
            created_at=user["created_at"],
            is_active=user.get("is_active", True),
        )

    return current_user
