import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def _conn():
    return pymysql.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", "1234"),
        db=os.getenv("DB_NAME", "kma_data"),
        charset="utf8mb4",
        autocommit=True,
        cursorclass=pymysql.cursors.DictCursor,
    )

def init_db():
    with _conn() as conn:
        with conn.cursor() as c:
            c.execute("""
            CREATE TABLE IF NOT EXISTS devices (
                deviceId VARCHAR(255) PRIMARY KEY,
                fcmToken TEXT,
                lat DOUBLE,
                lon DOUBLE
            )
            """)

def upsert_device(device_id: str, fcm: str, lat: float, lon: float):
    with _conn() as conn:
        with conn.cursor() as c:
            c.execute("""
                INSERT INTO devices (deviceId, fcmToken, lat, lon)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    fcmToken=VALUES(fcmToken),
                    lat=VALUES(lat),
                    lon=VALUES(lon)
            """, (device_id, fcm, lat, lon))

def all_devices():
    with _conn() as conn:
        with conn.cursor() as c:
            c.execute("SELECT deviceId, fcmToken, lat, lon FROM devices")
            return c.fetchall()

def get_grid_by_location_kor(full_location: str):
    """
    full_location 예시: "광주광역시 동구 학동"
    """
    parts = full_location.strip().split()
    if len(parts) != 3:
        return None

    level1, level2, level3 = parts

    with _conn() as conn:
        c = conn.cursor()
        c.execute("""
            SELECT `격자 X` as x, `격자 Y` as y
            FROM kma_grid
            WHERE `1단계` = %s AND `2단계` = %s AND `3단계` = %s
        """, (level1, level2, level3))
        row = c.fetchone()
        if row:
            return row['x'], row['y'] 
        return None
