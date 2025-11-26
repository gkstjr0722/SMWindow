import os
import logging
import requests
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from dotenv import load_dotenv
from pathlib import Path

from server.db import get_grid_by_location_kor  # DB에서 격자값 조회

# 환경변수 로드
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

# 한국 시간
KST = timezone(timedelta(hours=9))

# 실시간 API 엔드포인트
KMA_REALTIME_URL = "https://apihub.kma.go.kr/api/typ01/cgi-bin/url/nph-dfs_shrt_grd"

# 에러 정의
class LocationNotFoundError(Exception):
    pass

class UpstreamError(Exception):
    pass

def _get_weather_key() -> str:
    key = os.getenv("WEATHER_API_KEY")
    if not key:
        raise UpstreamError("API 키 누락")
    return key

def get_valid_tmfc_tmef() -> tuple[str, str]:
    """
    기상청 실시간 API에 맞는 발표시각(tmfc)와 예보시각(tmef) 계산
    발표 시각은 매일 2, 5, 8, 11, 14, 17, 20, 23시
    예보 시각은 발표시각 기준 +1시간
    """
    now = datetime.now(KST)
    hour = now.hour

    if hour < 2:
        tmfc_hour = 23
        tmfc_day = now - timedelta(days=1)
    elif hour < 5:
        tmfc_hour = 2
        tmfc_day = now
    elif hour < 8:
        tmfc_hour = 5
        tmfc_day = now
    elif hour < 11:
        tmfc_hour = 8
        tmfc_day = now
    elif hour < 14:
        tmfc_hour = 11
        tmfc_day = now
    elif hour < 17:
        tmfc_hour = 14
        tmfc_day = now
    elif hour < 20:
        tmfc_hour = 17
        tmfc_day = now
    elif hour < 23:
        tmfc_hour = 20
        tmfc_day = now
    else:
        tmfc_hour = 23
        tmfc_day = now

    tmfc = tmfc_day.strftime('%Y%m%d') + f"{tmfc_hour:02d}"
    tmef = (tmfc_day + timedelta(hours=1)).strftime('%Y%m%d%H')
    return tmfc, tmef

def get_realtime_forecast(location: str) -> dict:
    """
    실시간 초단기 예보를 조회하는 함수
    """
    grid = get_grid_by_location_kor(location)
    if not grid:
        raise LocationNotFoundError(f"격자 정보 없음: {location}")
    nx, ny = grid

    tmfc, tmef = get_valid_tmfc_tmef()
    key = _get_weather_key()

    params = {
        "tmfc": tmfc,
        "tmef": tmef,
        "vars": "TMP,SKY,POP",  # 기온, 하늘상태, 강수확률
        "nx": nx,
        "ny": ny,
        "authKey": key
    }

    try:
        res = requests.get(KMA_REALTIME_URL, params=params, timeout=10)
        res.raise_for_status()
    except Exception as e:
        logging.exception("기상청 실시간 예보 요청 실패")
        raise UpstreamError(f"기상청 API 오류: {e}")

    # 응답은 text 또는 csv일 수 있으니 여기선 그대로 반환
    return {
        "name": location,
        "tmfc": tmfc,
        "tmef": tmef,
        "raw": res.text
    }
