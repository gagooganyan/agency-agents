# VPN Whitelist Bypass — Design Spec
Date: 2026-06-03

## Context

In certain Russian regions and time windows, mobile operators activate a
whitelist-only mode via ТСПУ (DPI). All traffic is blocked except approved
Russian IP ranges (Yandex, VK, Sber, CDNVideo, etc.). Standard VPN protocols
(OpenVPN, WireGuard, plain VLESS/TCP) are detected and dropped.

The user has:
- A Telegram bot in Python (aiogram) already in production
- A German VPS with 3x-ui panel
- Happ as the client app (supports VLESS, Hysteria2, VMESS)

## Goal

Add whitelist-bypass capability to the existing bot without breaking it.
Users receive a single subscription link containing three obfuscated
connection configs. Happ auto-selects the working one.

## Security / Obfuscation Requirements

All user-facing names and config labels must be neutral — no mention of
VPN, proxy, Xray, or protocol names.

| Internal protocol       | User-facing codename |
|-------------------------|----------------------|
| VLESS+XHTTP+Reality     | Alpha                |
| Hysteria2               | Beta                 |
| VMESS+WS+TLS+SNI        | Gamma                |

## Architecture

```
[Telegram Bot (Python/aiogram)]
        │
        │  3x-ui REST API (HTTPS)
        ▼
[German VPS — 3x-ui panel]
        │
        ├── Inbound Alpha: VLESS+XHTTP+Reality (SNI: yandex.ru)
        ├── Inbound Beta:  Hysteria2 (QUIC/UDP)
        └── Inbound Gamma: VMESS+WS+TLS (SNI: vk.com)
                │
                └── Unified subscription URL → Happ
```

## Components

### New module: `whitelist_bypass/`

Placed alongside the existing bot code. Never modifies existing files.

```
whitelist_bypass/
├── __init__.py
├── xui_client.py      # 3x-ui API wrapper (login, inbounds, clients)
├── config_gen.py      # Builds inbound configs for Alpha/Beta/Gamma
├── subscription.py    # Assembles and delivers the subscription URL
└── handlers.py        # Telegram handlers (/connect, /mystatus)
```

### Integration point

In the existing bot's entry point, we add one line:
```python
from whitelist_bypass.handlers import register_handlers
register_handlers(dp)  # dp = existing Dispatcher
```

Nothing else in the existing code changes.

### Telegram commands (new)

| Command     | Description                              |
|-------------|------------------------------------------|
| `/connect`  | Get personal subscription link for Happ  |
| `/mystatus` | Check which channel is active            |

Admin commands (restricted by Telegram user ID):
| Command         | Description                          |
|-----------------|--------------------------------------|
| `/adduser`      | Create new user in 3x-ui + generate link |
| `/removeuser`   | Revoke access                        |
| `/stats`        | Traffic usage per user               |

### 3x-ui API usage

- `POST /login` — authenticate
- `GET  /xui/inbound/list` — verify inbounds exist
- `POST /xui/inbound/add` — create Alpha/Beta/Gamma inbounds on first run
- `POST /xui/inbound/addClient` — provision a user across all three inbounds
- `GET  /xui/inbound/{id}/clientTraffics/{email}` — usage stats

### Config parameters

**Alpha (VLESS+XHTTP+Reality)**
- Transport: XHTTP
- Security: Reality
- SNI: yandex.ru (whitelisted on all Russian operators)
- Fingerprint: chrome

**Beta (Hysteria2)**
- Transport: UDP/QUIC
- Auth: password
- Port: 443 (looks like QUIC/HTTP3)
- Obfs: salamander

**Gamma (VMESS+WS+TLS)**
- Transport: WebSocket
- TLS SNI: vk.com (whitelisted)
- Path: /`<random-8-char-slug>`

## Data Flow

1. User sends `/connect` in Telegram
2. Bot calls 3x-ui API → creates client across all three inbounds (if not exists)
3. Bot assembles subscription URL containing Alpha + Beta + Gamma configs
4. Bot sends URL to user as: `Твоя ссылка подключения: <url>`
5. User adds URL to Happ → Happ fetches configs → auto-selects working channel

## Error Handling

- If 3x-ui API is unreachable: reply "Сервис временно недоступен, попробуй позже"
- If a user already exists in 3x-ui: return existing subscription, no duplicate
- If subscription URL generation fails: log error, notify admin via Telegram

## Testing Plan

### Automated (`tests/`)
- `test_xui_client.py` — mock 3x-ui API, verify login + client creation
- `test_config_gen.py` — validate generated JSON configs for each protocol
- `test_subscription.py` — validate subscription URL format (parseable by Happ)

### Manual
1. Add subscription URL to Happ → confirm all 3 configs appear
2. Enable each config one by one → verify IP via ipinfo.io shows German server
3. Test `/connect` for a new user — confirm 3x-ui creates the client
4. Test `/connect` for existing user — confirm no duplicate is created
5. Real-world test: activate in whitelist-restricted mobile network

## Integration Safety

- Existing bot handlers are never modified
- New module is imported once at startup
- If `whitelist_bypass` fails to import, existing bot continues normally
  (wrap import in try/except in the entry point)
- All new DB state (if any) uses separate tables/keys prefixed `wb_`

## Out of Scope

- TURN relay via VK Calls (deferred to Phase 2 — requires custom DTLS client)
- WebRTC/olcRTC tunnel (experimental, Phase 3)
- iOS client support beyond Happ
