from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class Region:
    name: str
    reg_id: str
    category: str = "육상"


ALL_REGIONS: List[Region] = [
    Region(name="서울", reg_id="11B10101"),
    Region(name="인천", reg_id="11B20201"),
    Region(name="수원", reg_id="11B20601"),
    Region(name="춘천", reg_id="11D10301"),
    Region(name="강릉", reg_id="11D20501"),
    Region(name="청주", reg_id="11C20401"),
    Region(name="대전", reg_id="11C20404"),
    Region(name="세종", reg_id="11C20405"),
    Region(name="전주", reg_id="11F10201"),
    Region(name="광주", reg_id="11F20501"),
    Region(name="여수", reg_id="11F20401"),
    Region(name="대구", reg_id="11H10701"),
    Region(name="부산", reg_id="11H20201"),
    Region(name="울산", reg_id="11H20101"),
    Region(name="창원", reg_id="11H20301"),
    Region(name="제주", reg_id="11G00201"),
]

_SUFFIXES = ("특별자치시", "특별자치도", "특별시", "광역시", "자치시", "자치도", "시", "군", "구", "동", "읍", "면")


def _normalize(text: str) -> str:
    cleaned = text
    for suf in _SUFFIXES:
        cleaned = cleaned.replace(suf, " ")
    return " ".join(cleaned.split())


def search_regions(query: str, limit: int = 10) -> List[Region]:
    q = query.strip()
    if not q:
        return []
    normalized = _normalize(q)
    tokens = {q, normalized}
    tokens.update(normalized.split())
    matches: List[Region] = []
    for region in ALL_REGIONS:
        for token in tokens:
            if token and token in region.name:
                matches.append(region)
                break
    return matches[:limit]


def resolve_region(location: str) -> Region:
    raw = location.strip()
    if not raw:
        raise ValueError("위치를 입력해 주세요.")

    normalized = _normalize(raw)

    for region in ALL_REGIONS:
        if region.name == raw or region.name == normalized:
            return region

    for region in ALL_REGIONS:
        if region.name in raw or region.name in normalized:
            return region

    matches = search_regions(raw, limit=1)
    if matches:
        return matches[0]

    raise ValueError(f"예보 지점을 찾을 수 없습니다: {location}")
