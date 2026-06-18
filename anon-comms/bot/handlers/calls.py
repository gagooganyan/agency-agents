import logging

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.keyboards import cancel_kb, numbers_kb
from bot.states import BridgeStates, CallStates
from core import telnyx_client as telnyx
from core.config import settings
from core.database import get_or_create_user, get_user_numbers, save_pending_call, set_bridge_number

logger = logging.getLogger(__name__)
router = Router()


# ── /set_bridge ───────────────────────────────────────────────────────────────

@router.message(Command("set_bridge"))
async def cmd_set_bridge(message: Message, state: FSMContext) -> None:
    await message.answer(
        "📱 Введи свой <b>реальный</b> номер телефона.\n\n"
        "Когда тебе позвонят на виртуальный номер, "
        "звонок будет переадресован на него. "
        "При исходящем звонке Telnyx сначала позвонит тебе, "
        "потом соединит с абонентом — абонент увидит только виртуальный номер.\n\n"
        "Формат: <code>+79991234567</code>",
        parse_mode="HTML",
        reply_markup=cancel_kb(),
    )
    await state.set_state(BridgeStates.waiting_number)


@router.message(BridgeStates.waiting_number)
async def enter_bridge(message: Message, state: FSMContext) -> None:
    number = message.text.strip()
    if not number.startswith("+"):
        await message.answer("❌ Введи номер в формате +79991234567")
        return
    await set_bridge_number(message.from_user.id, number)
    await state.clear()
    await message.answer(f"✅ Номер переадресации установлен: <code>{number}</code>", parse_mode="HTML")


# ── /call ─────────────────────────────────────────────────────────────────────

@router.message(Command("call"))
async def cmd_call(message: Message, state: FSMContext) -> None:
    user = await get_or_create_user(message.from_user.id)

    if not user.get("bridge_number"):
        await message.answer(
            "⚠️ Сначала установи свой реальный номер командой /set_bridge\n\n"
            "Telnyx позвонит на него, ты ответишь — и соединит с нужным абонентом."
        )
        return

    numbers = await get_user_numbers(user["id"])
    if not numbers:
        await message.answer(
            "У тебя нет активных номеров.\n"
            "Используй /new_number чтобы получить номер."
        )
        return

    await message.answer(
        "📞 Выбери номер, с которого позвонить:",
        reply_markup=numbers_kb(numbers, "call_from"),
    )
    await state.set_state(CallStates.waiting_from_number)


@router.callback_query(CallStates.waiting_from_number, F.data.startswith("call_from:"))
async def pick_call_from(callback: CallbackQuery, state: FSMContext) -> None:
    from_number = callback.data.split(":", 1)[1]
    await state.update_data(from_number=from_number)
    await callback.message.edit_text(
        "📱 Введи номер, на который позвонить (например: <code>+79991234567</code>):",
        parse_mode="HTML",
        reply_markup=cancel_kb(),
    )
    await state.set_state(CallStates.waiting_to_number)
    await callback.answer()


@router.message(CallStates.waiting_to_number)
async def enter_call_to(message: Message, state: FSMContext) -> None:
    to_number = message.text.strip()
    if not to_number.startswith("+"):
        await message.answer("❌ Введи номер в формате +79991234567")
        return

    data = await state.get_data()
    await state.clear()

    user = await get_or_create_user(message.from_user.id)

    if not settings.TELNYX_VOICE_CONNECTION_ID:
        await message.answer("❌ TELNYX_VOICE_CONNECTION_ID не настроен. Проверь .env файл.")
        return

    try:
        webhook_url = f"{settings.WEBHOOK_BASE_URL}/webhooks/voice/call-control"
        call = await telnyx.create_outbound_call(
            from_number=data["from_number"],
            to_number=user["bridge_number"],
            connection_id=settings.TELNYX_VOICE_CONNECTION_ID,
            webhook_url=webhook_url,
        )
        call_control_id = call.get("call_control_id", "")
        await save_pending_call(
            call_control_id=call_control_id,
            telegram_id=message.from_user.id,
            from_number=data["from_number"],
            to_number=to_number,
        )
        await message.answer(
            f"📲 Звоним на твой номер <code>{user['bridge_number']}</code>...\n"
            f"Как только ответишь — соединим с <code>{to_number}</code>.\n"
            f"Абонент увидит: <code>{data['from_number']}</code>",
            parse_mode="HTML",
        )
    except Exception as exc:
        logger.error("create_outbound_call failed: %s", exc)
        await message.answer(f"❌ Ошибка при инициации звонка:\n<code>{exc}</code>", parse_mode="HTML")
