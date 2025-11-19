import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
import xml.etree.ElementTree as ET

import requests
from dotenv import load_dotenv
from urllib.parse import quote

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

from .regions import resolve_region

KMA_LAND_FCST_URL = (
    "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstMsgService/getLandFcst"
)
PM25_REALTIME_URL = (
    "https://apis.data.go.kr/B552584/ArpltnInfoInqireSvc/getCtprvnRltmMesureDnsty"
)
RAIN_TH = float(os.getenv("RAIN_MM_THRESHOLD", "0.2"))
PM25_TH = float(os.getenv("PM25_THRESHOLD", "35"))
KST = timezone(timedelta(hours=9))


class LocationNotFoundError(Exception):
    """Raised when a forecast region cannot be resolved."""


class UpstreamError(Exception):
    """Raised when an upstream API returns an unexpected failure."""


def _get_weather_key() -> str:
    key = os.getenv("WEATHER_API_KEY") or os.getenv("OWM_API_KEY")
    if not key:
        raise UpstreamError("WEATHER_API_KEY / OWM_API_KEY is not set")
    return key


def _get_pm25_api_key() -> str:
    key = os.getenv("PM25_API_KEY") or os.getenv("AIR_API_KEY")
    if not key:
        raise UpstreamError("PM25_API_KEY / AIR_API_KEY is not set")
    return key


def _find_region(location: str) -> Dict[str, Any]:
    try:
        region = resolve_region(location)
        return {"regName": region.name, "regId": region.reg_id}
    except ValueError as exc:
        raise LocationNotFoundError(str(exc)) from exc


def _latest_tmfc() -> str:
    now = datetime.now(KST)
    if now.hour >= 11:
        base = now.replace(hour=11, minute=0, second=0, microsecond=0)
    elif now.hour >= 2:
        base = now.replace(hour=2, minute=0, second=0, microsecond=0)
    else:
        base = (now - timedelta(days=1)).replace(
            hour=11, minute=0, second=0, microsecond=0
        )
    return base.strftime("%Y%m%d%H%M")


def _fetch_land_forecast(reg_id: str) -> Dict[str, Any]:
    params = {
        "authKey": _get_weather_key(),
        "regId": reg_id,
        "pageNo": 1,
        "numOfRows": 30,
        "dataType": "JSON",
        "tmFc": _latest_tmfc(),
    }
    try:
        resp = requests.get(KMA_LAND_FCST_URL, params=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise UpstreamError(f"Failed to fetch land forecast: {exc}") from exc

    try:
        items = (
            resp.json()
            .get("response", {})
            .get("body", {})
            .get("items", {})
            .get("item", [])
        )
    except Exception as exc:
        raise UpstreamError(f"Unexpected land forecast response: {exc}") from exc

    if not isinstance(items, list) or not items:
        raise UpstreamError("No land forecast items returned")

    for item in items:
        ta_value = (item.get("ta") or "").strip()
        if ta_value and ta_value not in {"-99", "-99.0"}:
            return item
    return items[0]


_SIDO_NAME_MAP = {
    "서울": "서울",
    "인천": "인천",
    "수원": "경기",
    "춘천": "강원",
    "강릉": "강원",
    "청주": "충북",
    "대전": "대전",
    "세종": "세종",
    "전주": "전북",
    "광주": "광주",
    "여수": "전남",
    "대구": "대구",
    "부산": "부산",
    "울산": "울산",
    "창원": "경남",
    "제주": "제주",
}


def _resolve_sido_name(region_name: str) -> str:
    return _SIDO_NAME_MAP.get(region_name, region_name)


def _coerce_pm_value(raw: Optional[str]) -> Optional[float]:
    if raw is None:
        return None
    text = raw.strip()
    if not text or text == "-":
        return None
    try:
        value = float(text)
        return value if value >= 0 else None
    except ValueError:
        stage_map = {"좋음": 15.0, "보통": 35.0, "나쁨": 75.0, "매우나쁨": 110.0}
        return stage_map.get(text)


def _fetch_pm25_by_region(name: str) -> Optional[float]:
    try:
        token = _get_pm25_api_key()
    except UpstreamError as exc:
        logging.warning("PM2.5 API key missing: %s", exc)
        return None

    sido = _resolve_sido_name(name)
    params = {
        "serviceKey": token,
        "returnType": "json",
        "sidoName": sido,
        "pageNo": 1,
        "numOfRows": 50,
        "ver": "1.3",
    }
    try:
        resp = requests.get(PM25_REALTIME_URL, params=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logging.warning("PM2.5 fetch failed for %s: %s", name, exc)
        return None

    try:
        payload = resp.json()
        items = (
            payload.get("response", {})
            .get("body", {})
            .get("items", [])
        )
    except Exception as exc:
        logging.warning("PM2.5 JSON parse failed for %s: %s", name, exc)
        return None

    if not items:
        logging.warning("PM2.5 items empty for %s", name)
        return None

    tokens = {name}
    cleaned = name.replace("광역시", "").replace("특별시", "")
    tokens.add(cleaned.strip())

    for item in items:
        station = (item.get("stationName") or "").strip()
        pm_val = (
            _coerce_pm_value(item.get("pm25Value"))
            or _coerce_pm_value(item.get("pm25Value24"))
        )
        if pm_val is None:
            continue
        if any(tok and tok in station for tok in tokens if tok):
            return pm_val
    for item in items:
        pm_val = (
            _coerce_pm_value(item.get("pm25Value"))
            or _coerce_pm_value(item.get("pm25Value24"))
        )
        if pm_val is not None:
            return pm_val

    logging.warning("PM2.5 value missing for %s", name)
    return None


def _fetch_pm25(lat: float, lon: float) -> Tuple[Optional[float], Optional[str]]:
    try:
        token = _get_pm25_api_key()
    except UpstreamError:
        return None, "PM25_TOKEN_NOT_SET"
    url = f"https://api.waqi.info/feed/geo:{lat};{lon}/"
    try:
        resp = requests.get(url, params={"token": token}, timeout=8)
        resp.raise_for_status()
        payload = resp.json()
    except requests.RequestException as exc:
        return None, f"pm25 fetch failed: {exc}"

    if payload.get("status") != "ok":
        if payload.get("data") == "LOCATION_NOT_FOUND":
            return None, "LOCATION_NOT_FOUND"
        return None, f"pm25 api status={payload.get('status')}"

    try:
        return float(payload["data"]["iaqi"]["pm25"]["v"]), None
    except Exception:
        return None, "pm25 missing in response"


def _recommend_close(rain_mm: float, pm25: Optional[float]) -> bool:
    if pm25 is not None and pm25 >= PM25_TH:
        return True
    if rain_mm is not None and rain_mm >= RAIN_TH:
        return True
    return False


def fetch_weather_by_coords(lat: float, lon: float, weather_key: str):
    if not weather_key:
        return {"error": "OWM_API_KEY not set"}

    try:
        weather_resp = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={
                "lat": lat,
                "lon": lon,
                "appid": weather_key,
                "units": "metric",
                "lang": "kr",
            },
            timeout=8,
        )
        weather_resp.raise_for_status()
        weather_json = weather_resp.json()
    except requests.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 404:
            return {"error": "LOCATION_NOT_FOUND"}
        return {"error": f"weather fetch failed: {exc}"}
    except requests.RequestException as exc:
        return {"error": f"weather fetch failed: {exc}"}

    pm25_value, pm25_error = _fetch_pm25(lat, lon)
    if pm25_error == "LOCATION_NOT_FOUND":
        return {"error": "LOCATION_NOT_FOUND"}

    rain_mm = 0.0
    rain_obj = weather_json.get("rain")
    if isinstance(rain_obj, dict):
        try:
            rain_mm = float(rain_obj.get("1h", 0.0) or 0.0)
        except (TypeError, ValueError):
            rain_mm = 0.0

    result = {
        "name": weather_json.get("name"),
        "tempC": weather_json.get("main", {}).get("temp"),
        "humidity": weather_json.get("main", {}).get("humidity"),
        "precip1h_mm": rain_mm,
        "pm25": pm25_value,
        "sky": (weather_json.get("weather") or [{}])[0].get("description"),
        "recommendClose": _recommend_close(rain_mm, pm25_value),
    }
    if pm25_error:
        result["pm25_error"] = pm25_error
    return result


def get_weather_for_location(location: str) -> Dict[str, Any]:
    region = _find_region(location)
    land = _fetch_land_forecast(region["regId"])

    temp_c = None
    raw_temp = land.get("ta")
    if raw_temp not in (None, "", "-99", "-99.0"):
        try:
            temp_c = float(raw_temp)
        except (TypeError, ValueError):
            temp_c = None

    precip_prob = None
    try:
        if land.get("rnSt") not in (None, ""):
            precip_prob = int(land["rnSt"])
    except (TypeError, ValueError):
        precip_prob = None

    try:
        pm25_value = _fetch_pm25_by_region(region["regName"])
    except UpstreamError:
        pm25_value = None

    return {
        "name": region["regName"],
        "tempC": temp_c,
        "sky": land.get("wf"),
        "precipProb": precip_prob,
        "pm25": pm25_value,
    }


# 수동 확인: uvicorn 실행 후 아래 명령으로 응답을 확인할 수 있다.
# curl "http://localhost:8000/api/weather?location=광주"
