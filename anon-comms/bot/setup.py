from aiogram import Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from bot.handlers import calls, common, numbers, sms


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(common.router)
    dp.include_router(numbers.router)
    dp.include_router(sms.router)
    dp.include_router(calls.router)
    return dp
