from fastapi import APIRouter
from fastapi import Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import database_session
from app.modules.statistics.repository import StatisticsRepository
from app.modules.statistics.schemas import StatisticsResponse
from app.modules.statistics.service import StatisticsService

router = APIRouter()

@router.get("", response_model=StatisticsResponse, summary="Consulta agregados públicos")
def get_statistics(
    zone_id: str = Query(min_length=1, max_length=80),
    crop_id: str = Query(min_length=1, max_length=80),
    season_year: int = Query(ge=1900, le=2200),
    db: Session = Depends(database_session),
) -> StatisticsResponse:
    repository = StatisticsRepository(db)
    return StatisticsService(repository).get_aggregates(zone_id, crop_id, season_year)
