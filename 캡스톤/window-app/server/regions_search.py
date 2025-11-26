from typing import Optional, Dict
from .db import get_conn

def find_location_row(query: str) -> Optional[Dict]:
    """
    예: '광주광역시 동구 서석동' -> kma_grid에서 해당 행 반환
    """
    # 공백/쉼표 정리
    parts = [p.strip() for p in query.replace(",", " ").split() if p.strip()]
    if len(parts) < 2:
        # 최소 시/도 + 시/군/구 정도는 있어야 의미 있음
        return None

    # 기본은 [시/도, 시/군/구, 동/읍/면] 구조로 가정
    sido = parts[0]                 # 광주광역시
    sigungu = parts[1] if len(parts) >= 2 else ""
    # 나머지는 동/읍/면 이름이 길 수 있으니 전부 합침
    dong = " ".join(parts[2:]) if len(parts) >= 3 else ""

    sql = """
        SELECT
            `구분`,
            `행정구역코드`,
            `1단계` AS sido,
            `2단계` AS sigungu,
            `3단계` AS dong,
            `경도(초/100)` AS lon,
            `위도(초/100)` AS lat,
            `격자 X` AS nx,
            `격자 Y` AS ny
        FROM kma_grid
        WHERE `1단계` LIKE %s
          AND (%s = '' OR `2단계` LIKE %s)
          AND (%s = '' OR `3단계` LIKE %s)
        LIMIT 1
    """

    # LIKE 검색 (부분 일치 허용)
    params = (
        f"%{sido}%",
        sigungu, f"%{sigungu}%",
        dong, f"%{dong}%",
    )

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return row
    finally:
        conn.close()
