from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton

COUNTRIES: dict[str, str] = {
    "🇺🇸 США": "US",
    "🇬🇧 Великобритания": "GB",
    "🇩🇪 Германия": "DE",
    "🇫🇷 Франция": "FR",
    "🇨🇦 Канада": "CA",
    "🇦🇺 Австралия": "AU",
    "🇳🇱 Нидерланды": "NL",
    "🇸🇪 Швеция": "SE",
}


def country_kb() -> InlineKeyboardMarkup:
    rows = [
        [InlineKeyboardButton(text=label, callback_data=f"country:{code}")]
        for label, code in COUNTRIES.items()
    ]
    rows.append([InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def numbers_kb(numbers: list[dict], action: str) -> InlineKeyboardMarkup:
    rows = [
        [
            InlineKeyboardButton(
                text=f"{n['number']}" + (f"  ({n['label']})" if n.get("label") else ""),
                callback_data=f"{action}:{n['number']}",
            )
        ]
        for n in numbers
    ]
    rows.append([InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def skip_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Пропустить →", callback_data="skip")],
            [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")],
        ]
    )


def cancel_kb() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="❌ Отмена", callback_data="cancel")]]
    )
