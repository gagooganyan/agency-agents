import logging
from typing import Optional

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.keyboards import cancel_kb, country_kb, numbers_kb, skip_kb
from bot.states import NumberStates
from core import telnyx_client as telnyx
from core.config import settings
from core.database import (
    deactivate_number,
    get_or_create_user,
    get_user_numbers,
    get_virtual_number_record,
    save_virtual_number,
)

logger = logging.getLogger(__name__)
router = Router()


# ── /new_number ───────────────────────────────────────────────────────────────

@router.message(Command("new_number"))
async def cmd_new_number(message: Message, state: FSMContext) -> None:
    await message.answer("🌍 Выбери страну для нового номера:", reply_markup=country_kb())
    await state.set_state(NumberStates.waiting_country)


@router.callback_query(NumberStates.waiting_country, F.data.startswith("country:"))
async def pick_country(callback: CallbackQuery, state: FSMContext) -> None:
    country_code = callback.data.split(":", 1)[1]
    await state.update_data(country_code=country_code)
    await callback.message.edit_text(
        "📝 Введи метку для номера (например «работа», «авито»)\n"
        "или нажми <b>Пропустить</b>:",
        parse_mode="HTML",
        reply_markup=skip_kb(),
    )
    await state.set_state(NumberStates.waiting_label)
    await callback.answer()


@router.callback_query(NumberStates.waiting_label, F.data == "skip")
async def skip_label(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await _do_purchase(callback.message, state, label=None)


@router.message(NumberStates.waiting_label)
async def enter_label(message: Message, state: FSMContext) -> None:
    await _do_purchase(message, state, label=message.text.strip())


async def _do_purchase(msg: Message, state: FSMContext, label: Optional[str]) -> None:
    data = await state.get_data()
    country_code = data["country_code"]
    await state.clear()

    status = await msg.answer("🔍 Ищу доступные номера...")

    try:
        available = await telnyx.search_available_numbers(country_code)
        if not available:
            await status.edit_text("❌ Нет доступных номеров в этой стране. Попробуй другую.")
            return

        phone_number = available[0]["phone_number"]
        await status.edit_text(f"💳 Покупаю номер <code>{phone_number}</code>...", parse_mode="HTML")

        order = await telnyx.purchase_number(
            phone_number,
            messaging_profile_id=settings.TELNYX_MESSAGING_PROFILE_ID,
        )

        pn_list = order.get("phone_numbers", [])
        telnyx_id = pn_list[0]["id"] if pn_list else phone_number

        user = await get_or_create_user(msg.chat.id)
        await save_virtual_number(user["id"], phone_number, telnyx_id, label)

        suffix = f"  ({label})" if label else ""
        await status.edit_text(
            f"✅ Номер получен!\n\n"
            f"📞 <code>{phone_number}</code>{suffix}\n\n"
            f"Входящие SMS и звонки придут прямо сюда.",
            parse_mode="HTML",
        )
    except Exception as exc:
        logger.error("purchase_number failed: %s", exc)
        await status.edit_text(f"❌ Ошибка при покупке номера:\n<code>{exc}</code>", parse_mode="HTML")


# ── /my_numbers ───────────────────────────────────────────────────────────────

@router.message(Command("my_numbers"))
async def cmd_my_numbers(message: Message) -> None:
    user = await get_or_create_user(message.from_user.id)
    numbers = await get_user_numbers(user["id"])

    if not numbers:
        await message.answer(
            "У тебя нет активных номеров.\n"
            "Используй /new_number чтобы получить номер."
        )
        return

    lines = ["📋 <b>Твои активные номера:</b>\n"]
    for n in numbers:
        label = f"  — {n['label']}" if n.get("label") else ""
        lines.append(f"• <code>{n['number']}</code>{label}")
    await message.answer("\n".join(lines), parse_mode="HTML")


# ── /release ──────────────────────────────────────────────────────────────────

@router.message(Command("release"))
async def cmd_release(message: Message, state: FSMContext) -> None:
    user = await get_or_create_user(message.from_user.id)
    numbers = await get_user_numbers(user["id"])

    if not numbers:
        await message.answer("У тебя нет активных номеров.")
        return

    await message.answer(
        "Выбери номер для освобождения:",
        reply_markup=numbers_kb(numbers, "release"),
    )
    await state.set_state(NumberStates.waiting_release_pick)


@router.callback_query(NumberStates.waiting_release_pick, F.data.startswith("release:"))
async def do_release(callback: CallbackQuery, state: FSMContext) -> None:
    number = callback.data.split(":", 1)[1]
    user = await get_or_create_user(callback.from_user.id)

    record = await get_virtual_number_record(number)
    if record:
        await telnyx.release_number(record["telnyx_number_id"])
        await deactivate_number(number, user["id"])
        await callback.message.edit_text(f"✅ Номер <code>{number}</code> освобождён.", parse_mode="HTML")
    else:
        await callback.message.edit_text("❌ Номер не найден.")

    await state.clear()
    await callback.answer()


# ── Universal cancel ──────────────────────────────────────────────────────────

@router.callback_query(F.data == "cancel")
async def cb_cancel(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await callback.message.edit_text("❌ Отменено.")
    await callback.answer()
