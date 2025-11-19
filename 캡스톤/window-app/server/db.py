import os, sqlite3, time
DB_PATH = os.path.join(os.path.dirname(__file__), "smart.db")

def _conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    with _conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS devices(
            deviceId TEXT PRIMARY KEY,
            fcmToken TEXT,
            lat REAL,
            lon REAL,
            updatedAt TEXT
        )""")
        c.commit()

def upsert_device(deviceId: str, fcmToken: str, lat: float, lon: float):
    with _conn() as c:
        c.execute("""INSERT INTO devices(deviceId,fcmToken,lat,lon,updatedAt)
                     VALUES(?,?,?,?,?)
                     ON CONFLICT(deviceId) DO UPDATE SET
                     fcmToken=excluded.fcmToken, lat=excluded.lat,
                     lon=excluded.lon, updatedAt=excluded.updatedAt""",
                  (deviceId, fcmToken, lat, lon, time.strftime("%Y-%m-%d %H:%M:%S")))
        c.commit()

def all_devices():
    with _conn() as c:
        rows = c.execute("SELECT deviceId,fcmToken,lat,lon FROM devices").fetchall()
        return [{"deviceId":r[0], "fcmToken":r[1], "lat":r[2], "lon":r[3]} for r in rows]
