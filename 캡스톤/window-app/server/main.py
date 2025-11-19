import os, asyncio, json, logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from .mqtt_client import mqtt
from .weather import (
    fetch_weather_by_coords,
    get_weather_for_location,
    LocationNotFoundError,
    UpstreamError,
)
from .db import init_db, upsert_device, all_devices
from .push import init_firebase, send_push
from .regions import search_regions

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
OWM_API_KEY = os.getenv("OWM_API_KEY", "")

app = FastAPI(title="Window API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"], allow_credentials=True
)

@app.on_event("startup")
async def startup():
    init_db()
    mqtt.start()
    init_firebase()
    # MQTT 이벤트 -> 푸시
    def listener(topic: str, data: dict):
        try:
            if topic == "window/state":
                if data.get("reason") == "rain" and data.get("pos") == "closed":
                    tokens = [d["fcmToken"] for d in all_devices() if d.get("fcmToken")]
                    send_push("빗물 감지 자동 닫힘", "비로 인해 창문이 자동으로 닫혔습니다.", tokens, data)
        except Exception as e:
            logging.exception(e)
    mqtt.add_listener(listener)
    # 백그라운드 권장 알림
    asyncio.create_task(_periodic_recommend())

async def _periodic_recommend():
    while True:
        try:
            devices = all_devices()
            tokens = [d["fcmToken"] for d in devices if d.get("fcmToken")]
            for d in devices:
                w = fetch_weather_by_coords(d["lat"], d["lon"], OWM_API_KEY)
                if isinstance(w, dict) and w.get("recommendClose"):
                    send_push("창문 닫기 권장", "날씨/대기질 기준으로 창문 닫기를 권장합니다.", tokens, w)
        except Exception as e:
            logging.exception(e)
        await asyncio.sleep(600)  # 10분

@app.get("/api/health")
async def health(): return {"ok": True}

class Cmd(BaseModel):
    action: str

@app.post("/api/command")
async def api_command(cmd: Cmd):
    if cmd.action not in ("open","close","stop"):
        return JSONResponse({"error":"invalid action"}, status_code=400)
    mqtt.publish_cmd(cmd.action)
    return {"ok": True}

@app.get("/api/state")
async def api_state():
    return mqtt.last_state or {"pos":"unknown"}

@app.get("/api/regions")
async def api_regions(
    query: str | None = Query(None, description="예보구역 이름 검색어"),
    limit: int = 10,
):
    safe_query = query or ""
    results = search_regions(safe_query, limit=limit)
    return [
        {"name": r.name, "regId": r.reg_id}
        for r in results
    ]

@app.get("/api/weather")
def api_weather(
    location: str = Query(..., description="예보구역 이름(예: 광주광역시, 서울특별시)")
):
    try:
        return get_weather_for_location(location)
    except LocationNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail={"error": "LOCATION_NOT_FOUND", "message": str(exc)},
        ) from exc
    except UpstreamError as exc:
        raise HTTPException(
            status_code=502, detail={"error": "UPSTREAM_ERROR", "message": str(exc)}
        ) from exc

class Register(BaseModel):
    deviceId: str
    fcmToken: str | None = None
    lat: float
    lon: float

@app.post("/api/register")
async def api_register(reg: Register):
    upsert_device(reg.deviceId, reg.fcmToken or "", reg.lat, reg.lon)
    return {"ok": True}
