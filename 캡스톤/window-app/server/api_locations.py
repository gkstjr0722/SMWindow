from fastapi import APIRouter, HTTPException, Query
from .regions_search import find_location_row

router = APIRouter()

@router.get("/api/locations/search")
def search_location(q: str = Query(..., description="예: '광주광역시 동구 서석동'")):
    row = find_location_row(q)
    if not row:
        raise HTTPException(status_code=404, detail="해당 지역을 찾을 수 없습니다.")

    return {
        "sido": row["sido"],
        "sigungu": row["sigungu"],
        "dong": row["dong"],
        "adm_cd": row["행정구역코드"],
        "lat": row["lat"],
        "lon": row["lon"],
        "nx": row["nx"],
        "ny": row["ny"],
    }
