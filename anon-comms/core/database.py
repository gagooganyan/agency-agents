import os
import aiosqlite
from contextlib import asynccontextmanager
from typing import Optional

from core.config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id BIGINT  UNIQUE NOT NULL,
    bridge_number TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS virtual_numbers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    number           TEXT UNIQUE NOT NULL,
    telnyx_number_id TEXT NOT NULL,
    user_id          INTEGER NOT NULL,
    label            TEXT,
    active           INTEGER DEFAULT 1,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sms_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    number      TEXT NOT NULL,
    direction   TEXT NOT NULL,
    from_number TEXT NOT NULL,
    to_number   TEXT NOT NULL,
    body        TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_calls (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    call_control_id      TEXT UNIQUE NOT NULL,
    dest_call_control_id TEXT,
    telegram_id          BIGINT NOT NULL,
    from_number          TEXT NOT NULL,
    to_number            TEXT NOT NULL,
    status               TEXT DEFAULT 'ringing',
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


async def init_db() -> None:
    db_dir = os.path.dirname(settings.DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    async with aiosqlite.connect(settings.DB_PATH) as db:
        await db.executescript(SCHEMA)
        await db.commit()


@asynccontextmanager
async def db_conn():
    async with aiosqlite.connect(settings.DB_PATH) as conn:
        conn.row_factory = aiosqlite.Row
        yield conn


# ── Users ────────────────────────────────────────────────────────────────────

async def get_or_create_user(telegram_id: int) -> dict:
    async with db_conn() as db:
        cur = await db.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
        row = await cur.fetchone()
        if row:
            return dict(row)
        await db.execute("INSERT INTO users (telegram_id) VALUES (?)", (telegram_id,))
        await db.commit()
        cur = await db.execute("SELECT * FROM users WHERE telegram_id = ?", (telegram_id,))
        return dict(await cur.fetchone())


async def set_bridge_number(telegram_id: int, number: str) -> None:
    async with db_conn() as db:
        await db.execute(
            "UPDATE users SET bridge_number = ? WHERE telegram_id = ?",
            (number, telegram_id),
        )
        await db.commit()


# ── Virtual numbers ───────────────────────────────────────────────────────────

async def save_virtual_number(
    user_id: int, number: str, telnyx_number_id: str, label: Optional[str] = None
) -> dict:
    async with db_conn() as db:
        await db.execute(
            "INSERT INTO virtual_numbers (number, telnyx_number_id, user_id, label) VALUES (?,?,?,?)",
            (number, telnyx_number_id, user_id, label),
        )
        await db.commit()
        cur = await db.execute("SELECT * FROM virtual_numbers WHERE number = ?", (number,))
        return dict(await cur.fetchone())


async def get_user_numbers(user_id: int) -> list[dict]:
    async with db_conn() as db:
        cur = await db.execute(
            "SELECT * FROM virtual_numbers WHERE user_id = ? AND active = 1 ORDER BY created_at DESC",
            (user_id,),
        )
        return [dict(r) for r in await cur.fetchall()]


async def get_virtual_number_record(number: str) -> Optional[dict]:
    async with db_conn() as db:
        cur = await db.execute(
            "SELECT * FROM virtual_numbers WHERE number = ? AND active = 1", (number,)
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def get_number_owner(number: str) -> Optional[dict]:
    async with db_conn() as db:
        cur = await db.execute(
            """
            SELECT u.* FROM users u
            JOIN virtual_numbers vn ON vn.user_id = u.id
            WHERE vn.number = ? AND vn.active = 1
            """,
            (number,),
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def deactivate_number(number: str, user_id: int) -> bool:
    async with db_conn() as db:
        cur = await db.execute(
            "UPDATE virtual_numbers SET active = 0 WHERE number = ? AND user_id = ?",
            (number, user_id),
        )
        await db.commit()
        return cur.rowcount > 0


# ── SMS log ───────────────────────────────────────────────────────────────────

async def log_sms(number: str, direction: str, from_num: str, to_num: str, body: str) -> None:
    async with db_conn() as db:
        await db.execute(
            "INSERT INTO sms_log (number, direction, from_number, to_number, body) VALUES (?,?,?,?,?)",
            (number, direction, from_num, to_num, body),
        )
        await db.commit()


# ── Pending calls (bridge call tracking) ──────────────────────────────────────

async def save_pending_call(
    call_control_id: str, telegram_id: int, from_number: str, to_number: str
) -> None:
    async with db_conn() as db:
        await db.execute(
            "INSERT INTO pending_calls (call_control_id, telegram_id, from_number, to_number) VALUES (?,?,?,?)",
            (call_control_id, telegram_id, from_number, to_number),
        )
        await db.commit()


async def get_pending_call(call_control_id: str) -> Optional[dict]:
    async with db_conn() as db:
        cur = await db.execute(
            "SELECT * FROM pending_calls WHERE call_control_id = ? AND status != 'ended'",
            (call_control_id,),
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def get_pending_call_by_dest(dest_call_control_id: str) -> Optional[dict]:
    async with db_conn() as db:
        cur = await db.execute(
            "SELECT * FROM pending_calls WHERE dest_call_control_id = ? AND status != 'ended'",
            (dest_call_control_id,),
        )
        row = await cur.fetchone()
        return dict(row) if row else None


async def update_pending_call(call_control_id: str, dest_call_control_id: str) -> None:
    async with db_conn() as db:
        await db.execute(
            "UPDATE pending_calls SET dest_call_control_id = ?, status = 'connecting' WHERE call_control_id = ?",
            (dest_call_control_id, call_control_id),
        )
        await db.commit()


async def end_pending_call(call_control_id: str) -> None:
    async with db_conn() as db:
        await db.execute(
            "UPDATE pending_calls SET status = 'ended' WHERE call_control_id = ? OR dest_call_control_id = ?",
            (call_control_id, call_control_id),
        )
        await db.commit()
