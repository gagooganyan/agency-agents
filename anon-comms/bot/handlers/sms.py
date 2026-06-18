import logging

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from bot.keyboards import cancel_kb, numbers_kb
from bot.states import SMSStates
from core import telnyx_client as telnyx
from core.database import get_or_create_user, get_user_numbers, log_sms

logger = logging.getLogger(__name__)
router = Router()


@router.message(Command("send_sms"))
async def cmd_send_sms(message: Message, state: FSMContext) -> None:
    user = await get_or_create_user(message.from_user.id)
    numbers = await get_user_numbers(user["id"])

    if not numbers:
        await message.answer(
            "У тебя нет активных номеров.\n"
            "Используй /new_number чтобы получить номер."
        )
        return

    await message.answer(
        "📤 Выбери номер отправителя:",
        reply_markup=numbers_kb(numbers, "sms_from"),
    )
    await state.set_state(SMSStates.waiting_from_number)


@router.callback_query(SMSStates.waiting_from_number, F.data.startswith("sms_from:"))
async def pick_from(callback: CallbackQuery, state: FSMContext) -> None:
    from_number = callback.data.split(":", 1)[1]
    await state.update_data(from_number=from_number)
    await callback.message.edit_text(
        "📱 Введи номер получателя (например: <code>+79991234567</code>):",
        parse_mode="HTML",
        reply_markup=cancel_kb(),
    )
    await state.set_state(SMSStates.waiting_to_number)
    await callback.answer()


@router.message(SMSStates.waiting_to_number)
async def enter_to(message: Message, state: FSMContext) -> None:
    to_number = message.text.strip()
    if not to_number.startswith("+"):
        await message.answer("❌ Введи номер в формате +79991234567")
        return
    await state.update_data(to_number=to_number)
    await message.answer("✏️ Введи текст сообщения:", reply_markup=cancel_kb())
    await state.set_state(SMSStates.waiting_text)


@router.message(SMSStates.waiting_text)
async def enter_text(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    await state.clear()

    try:
        await telnyx.send_sms(data["from_number"], data["to_number"], message.text)
        await log_sms(data["from_number"], "out", data["from_number"], data["to_number"], message.text)
        await message.answer(
            f"✅ SMS отправлено!\n"
            f"От: <code>{data['from_number']}</code>\n"
            f"Кому: <code>{data['to_number']}</code>",
            parse_mode="HTML",
        )
    except Exception as exc:
        logger.error("send_sms failed: %s", exc)
        await message.answer(f"❌ Ошибка отправки:\n<code>{exc}</code>", parse_mode="HTML")
