from aiogram import Router
from aiogram.filters import CommandStart, Command
from aiogram.types import Message

from core.database import get_or_create_user

router = Router()

HELP_TEXT = """
🔒 <b>Анонимные одноразовые звонки и SMS</b>

<b>Номера</b>
/new_number — получить новый виртуальный номер
/my_numbers — список активных номеров
/release — освободить номер

<b>SMS</b>
/send_sms — отправить SMS с виртуального номера
Входящие SMS придут прямо сюда автоматически.

<b>Звонки</b>
/set_bridge — мой реальный номер для звонков
/call — позвонить анонимно (bridge-схема)
Входящие звонки: переадресация или голосовая почта.

<b>Как работает анонимный звонок:</b>
Telnyx сначала звонит тебе на реальный номер → ты берёшь трубку → Telnyx соединяет с абонентом. Абонент видит только виртуальный номер.
"""


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await get_or_create_user(message.from_user.id)
    await message.answer(
        f"👋 Привет, {message.from_user.first_name}!\n" + HELP_TEXT,
        parse_mode="HTML",
    )


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(HELP_TEXT, parse_mode="HTML")
