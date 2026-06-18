import logging
from io import BytesIO

import httpx
from aiogram import Bot
from fastapi import FastAPI, Request, Response

from core import telnyx_client as telnyx
from core.config import settings
from core.database import (
    end_pending_call,
    get_number_owner,
    get_pending_call,
    get_pending_call_by_dest,
    log_sms,
    save_pending_call,
    update_pending_call,
)

logger = logging.getLogger(__name__)


def create_app(bot: Bot) -> FastAPI:
    app = FastAPI(title="AnonComms", docs_url=None, redoc_url=None)

    # ── Health ────────────────────────────────────────────────────────────────

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    # ── Incoming SMS (Telnyx messaging webhook) ───────────────────────────────

    @app.post("/webhooks/sms")
    async def sms_webhook(request: Request) -> Response:
        try:
            body = await request.json()
            event_type = body.get("data", {}).get("event_type", "")

            if event_type == "message.received":
                payload = body["data"]["payload"]
                to_number = (payload.get("to") or [{}])[0].get("phone_number", "")
                from_number = payload.get("from", {}).get("phone_number", "")
                text = payload.get("text", "")

                owner = await get_number_owner(to_number)
                if owner:
                    await log_sms(to_number, "in", from_number, to_number, text)
                    await bot.send_message(
                        chat_id=owner["telegram_id"],
                        text=(
                            f"📨 <b>Входящее SMS</b>\n"
                            f"На номер: <code>{to_number}</code>\n"
                            f"От: <code>{from_number}</code>\n\n"
                            f"{text}"
                        ),
                        parse_mode="HTML",
                    )
        except Exception as exc:
            logger.error("sms_webhook error: %s", exc)

        return Response(status_code=200)

    # ── Incoming voice call (TeXML) ───────────────────────────────────────────

    @app.api_route("/webhooks/voice/inbound", methods=["GET", "POST"])
    async def voice_inbound(request: Request) -> Response:
        if request.method == "POST":
            form = await request.form()
            params = dict(form)
        else:
            params = dict(request.query_params)

        to_number = params.get("To") or params.get("to", "")
        from_number = params.get("From") or params.get("from", "")

        owner = await get_number_owner(to_number)

        if owner:
            try:
                await bot.send_message(
                    chat_id=owner["telegram_id"],
                    text=(
                        f"📞 <b>Входящий звонок</b>\n"
                        f"На номер: <code>{to_number}</code>\n"
                        f"От: <code>{from_number}</code>"
                    ),
                    parse_mode="HTML",
                )
            except Exception as exc:
                logger.error("bot.send_message failed: %s", exc)

            if owner.get("bridge_number"):
                xml = (
                    '<?xml version="1.0" encoding="UTF-8"?>'
                    "<Response>"
                    f'<Dial callerId="{to_number}">{owner["bridge_number"]}</Dial>'
                    "</Response>"
                )
            else:
                vm_url = f"{settings.WEBHOOK_BASE_URL}/webhooks/voicemail"
                xml = (
                    '<?xml version="1.0" encoding="UTF-8"?>'
                    "<Response>"
                    '<Say language="ru-RU">Оставьте голосовое сообщение после сигнала.</Say>'
                    f'<Record action="{vm_url}" maxLength="120" playBeep="true"/>'
                    '<Say language="ru-RU">Запись завершена. До свидания.</Say>'
                    "</Response>"
                )
        else:
            xml = (
                '<?xml version="1.0" encoding="UTF-8"?>'
                "<Response>"
                "<Say>This number is not available.</Say>"
                "</Response>"
            )

        return Response(content=xml, media_type="application/xml")

    # ── Voicemail recording saved ─────────────────────────────────────────────

    @app.post("/webhooks/voicemail")
    async def voicemail_webhook(request: Request) -> Response:
        try:
            form = await request.form()
            to_number = form.get("To", "")
            from_number = form.get("From", "")
            recording_url = form.get("RecordingUrl", "")

            owner = await get_number_owner(to_number)
            if owner and recording_url:
                await bot.send_message(
                    chat_id=owner["telegram_id"],
                    text=(
                        f"🎙 <b>Голосовое сообщение</b>\n"
                        f"На номер: <code>{to_number}</code>\n"
                        f"От: <code>{from_number}</code>"
                    ),
                    parse_mode="HTML",
                )
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(recording_url, follow_redirects=True)
                    if resp.status_code == 200:
                        audio = BytesIO(resp.content)
                        audio.name = "voicemail.ogg"
                        await bot.send_voice(chat_id=owner["telegram_id"], voice=audio)
        except Exception as exc:
            logger.error("voicemail_webhook error: %s", exc)

        return Response(status_code=200)

    # ── Outbound bridge call events (Call Control API) ────────────────────────

    @app.post("/webhooks/voice/call-control")
    async def call_control_webhook(request: Request) -> Response:
        try:
            body = await request.json()
            event_type = body.get("data", {}).get("event_type", "")
            payload = body.get("data", {}).get("payload", {})
            cid = payload.get("call_control_id", "")

            if event_type == "call.answered":
                pending = await get_pending_call(cid)
                if pending and not pending.get("dest_call_control_id"):
                    # User picked up — now call the destination
                    webhook_url = f"{settings.WEBHOOK_BASE_URL}/webhooks/voice/call-control"
                    dest = await telnyx.create_outbound_call(
                        from_number=pending["from_number"],
                        to_number=pending["to_number"],
                        connection_id=settings.TELNYX_VOICE_CONNECTION_ID,
                        webhook_url=webhook_url,
                    )
                    dest_cid = dest.get("call_control_id", "")
                    await update_pending_call(cid, dest_cid)
                    await bot.send_message(
                        chat_id=pending["telegram_id"],
                        text=f"🔗 Соединяем с <code>{pending['to_number']}</code>...",
                        parse_mode="HTML",
                    )
                else:
                    # Destination picked up — bridge both legs
                    pending = await get_pending_call_by_dest(cid)
                    if pending:
                        await telnyx.bridge_calls(pending["call_control_id"], cid)
                        await bot.send_message(
                            chat_id=pending["telegram_id"],
                            text=f"✅ Соединено с <code>{pending['to_number']}</code>",
                            parse_mode="HTML",
                        )

            elif event_type == "call.hangup":
                pending = await get_pending_call(cid) or await get_pending_call_by_dest(cid)
                if pending:
                    await end_pending_call(cid)
                    await bot.send_message(
                        chat_id=pending["telegram_id"],
                        text="📵 Звонок завершён.",
                    )

        except Exception as exc:
            logger.error("call_control_webhook error: %s", exc)

        return Response(status_code=200)

    return app
