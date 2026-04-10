from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.dashboard_service import get_dashboard_summary


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(db: AsyncSession = Depends(get_db)):
    return await get_dashboard_summary(db)
