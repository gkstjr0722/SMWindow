import os, asyncio, json, logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
# from weather import get_realtime_forecast, LocationNotFoundError, UpstreamError
import httpx

from .mqtt_client import mqtt
from server.weather import get_realtime_forecast, LocationNotFoundError, UpstreamError
from .db import init_db, upsert_device, all_devices
from .push import init_firebase, send_push
from .regions import search_regions
from server.weather import get_weather_for_location

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
OWM_API_KEY = os.getenv("OWM_API_KEY", "")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.20.10.5:5173",
]

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
def api_weather(location: str):
    try:
        return get_weather_for_location(location)
    except LocationNotFoundError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": {"error": "LOCATION_NOT_FOUND", "message": str(e)}}
        )
    except UpstreamError as e:
        return JSONResponse(
            status_code=502,
            content={"detail": {"error": "UPSTREAM_ERROR", "message": str(e)}}
        )

@app.get("/api/weather/realtime")
def api_weather_realtime(location: str):
    try:
        return get_realtime_forecast(location)
    except LocationNotFoundError as e:
        return JSONResponse(
            status_code=400,
            content={"detail": {"error": "LOCATION_NOT_FOUND", "message": str(e)}}
        )
    except UpstreamError as e:
        return JSONResponse(
            status_code=502,
            content={"detail": {"error": "UPSTREAM_ERROR", "message": str(e)}}
        )

class Register(BaseModel):
    deviceId: str
    fcmToken: str | None = None
    lat: float | None = None
    lon: float | None = None

@app.post("/api/register")
async def api_register(reg: Register):
    upsert_device(reg.deviceId, reg.fcmToken or "", reg.lat, reg.lon)
    return {"ok": True}

# ✅ ESP32 중계용 설정
ESP32_BASE_URL = os.getenv("ESP32_BASE_URL", "http://172.20.10.4")  # 실제 ESP32 주소로 수정

@app.post("/esp32/command")
async def esp32_command_proxy(request: Request):
    try:
        payload = await request.json()

        # ✅ 여기! 들어오는 요청 내용을 확인하기 위한 로그
        print("[ESP32] 프론트에서 받은 payload:", payload)

        async with httpx.AsyncClient() as client:
            res = await client.post(f"{ESP32_BASE_URL}/command", json=payload)

        return JSONResponse(status_code=res.status_code, content=res.json())

    except Exception as e:
        import traceback
        print("❌ ESP32 command 에러 발생:", e)
        traceback.print_exc()  # 전체 에러 로그 출력
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/esp32/state")
async def esp32_state_proxy():
    try:
        async with httpx.AsyncClient() as client:
            res = await client.get(f"{ESP32_BASE_URL}/status")
        return JSONResponse(status_code=res.status_code, content=res.json())
    except Exception as e:
        logging.exception("ESP32 state 오류 발생")
        raise HTTPException(status_code=502, detail=str(e))
    
    print("[ESP32] 프론트에서 받은 payload:", payload)
    traceback.print_exc()



if __name__ == "__main__":
    from .db import get_grid_by_location_kor  # ✅ 재확인용 (FastAPI 구조상 상대경로 사용 중이면 필요할 수도 있음)
    print("격자 테스트:", get_grid_by_location_kor("광주광역시 동구 학동"))
