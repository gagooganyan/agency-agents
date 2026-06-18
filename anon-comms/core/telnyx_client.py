import httpx
from typing import Optional

from core.config import settings

_BASE = "https://api.telnyx.com/v2"


async def _req(method: str, path: str, **kwargs) -> dict:
    headers = {
        "Authorization": f"Bearer {settings.TELNYX_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.request(method, f"{_BASE}{path}", headers=headers, **kwargs)
        resp.raise_for_status()
        return resp.json()


# ── Number search & purchase ──────────────────────────────────────────────────

async def search_available_numbers(country_code: str = "US", limit: int = 5) -> list[dict]:
    data = await _req(
        "GET",
        "/available_phone_numbers",
        params={
            "filter[country_code]": country_code,
            "filter[features][]": ["sms", "voice"],
            "page[size]": limit,
        },
    )
    return data.get("data", [])


async def purchase_number(phone_number: str, messaging_profile_id: str = "") -> dict:
    payload: dict = {"phone_numbers": [{"phone_number": phone_number}]}
    if messaging_profile_id:
        payload["messaging_profile_id"] = messaging_profile_id
    data = await _req("POST", "/phone_number_orders", json=payload)
    return data.get("data", {})


async def release_number(phone_number_id: str) -> bool:
    try:
        await _req("DELETE", f"/phone_numbers/{phone_number_id}")
        return True
    except Exception:
        return False


# ── SMS ───────────────────────────────────────────────────────────────────────

async def send_sms(from_number: str, to_number: str, text: str) -> dict:
    data = await _req(
        "POST",
        "/messages",
        json={"from": from_number, "to": to_number, "text": text, "type": "SMS"},
    )
    return data.get("data", {})


# ── Voice (Call Control) ──────────────────────────────────────────────────────

async def create_outbound_call(
    from_number: str,
    to_number: str,
    connection_id: str,
    webhook_url: str,
) -> dict:
    data = await _req(
        "POST",
        "/calls",
        json={
            "connection_id": connection_id,
            "to": to_number,
            "from": from_number,
            "webhook_url": webhook_url,
            "webhook_url_method": "POST",
        },
    )
    return data.get("data", {})


async def bridge_calls(call_control_id: str, target_call_control_id: str) -> None:
    await _req(
        "POST",
        f"/calls/{call_control_id}/actions/bridge",
        json={"call_control_id": target_call_control_id},
    )
