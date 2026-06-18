import asyncio
import logging

import uvicorn
from aiogram import Bot

from api.app import create_app
from bot.setup import create_dispatcher
from core.config import settings
from core.database import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


async def main() -> None:
    await init_db()
    logger.info("Database ready")

    bot = Bot(token=settings.BOT_TOKEN)
    dp = create_dispatcher()
    app = create_app(bot)

    server = uvicorn.Server(
        uvicorn.Config(app, host="0.0.0.0", port=settings.PORT, log_level="warning")
    )

    logger.info("Starting bot (polling) + webhook server on :%s", settings.PORT)
    await asyncio.gather(
        server.serve(),
        dp.start_polling(bot, skip_updates=True),
    )


if __name__ == "__main__":
    asyncio.run(main())
