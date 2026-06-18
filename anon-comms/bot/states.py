from aiogram.fsm.state import State, StatesGroup


class NumberStates(StatesGroup):
    waiting_country = State()
    waiting_label = State()
    waiting_release_pick = State()


class SMSStates(StatesGroup):
    waiting_from_number = State()
    waiting_to_number = State()
    waiting_text = State()


class CallStates(StatesGroup):
    waiting_from_number = State()
    waiting_to_number = State()


class BridgeStates(StatesGroup):
    waiting_number = State()
