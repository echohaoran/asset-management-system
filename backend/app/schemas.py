from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    username: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    username: Optional[str] = None


class UserPasswordUpdate(BaseModel):
    password: str


class PersonCreate(BaseModel):
    name: str
    department: str = ""


class PersonOut(BaseModel):
    id: int
    name: str
    department: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    description: str = ""


class CategoryOut(BaseModel):
    id: int
    name: str
    description: str
    asset_count: int = 0

    model_config = {"from_attributes": True}


class AssetCreate(BaseModel):
    name: str
    category_id: int
    price: float = 0.0
    purchase_date: Optional[str] = None
    description: str = ""
    model: str = ""
    color: str = ""
    asset_code: str = ""
    sn: str = ""


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    price: Optional[float] = None
    purchase_date: Optional[str] = None
    description: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    asset_code: Optional[str] = None
    sn: Optional[str] = None


class AssetLogOut(BaseModel):
    id: int
    action: str
    operator_id: int
    detail: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AssetOut(BaseModel):
    id: int
    name: str
    category_id: int
    category_name: str = ""
    price: float
    purchase_date: datetime
    status: str
    person_id: Optional[int] = None
    person_name: Optional[str] = None
    description: str
    model: str = ""
    color: str = ""
    asset_code: str = ""
    sn: str = ""
    created_at: datetime
    updated_at: datetime
    logs: List[AssetLogOut] = []

    model_config = {"from_attributes": True}


class PersonWithAssets(PersonOut):
    assets: List[AssetOut] = []


class DashboardStats(BaseModel):
    total_assets: int
    in_stock: int
    checked_out: int
    disposed: int
    total_value: float
    category_stats: List[dict]
