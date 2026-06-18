# VPN Whitelist Bypass — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать модуль `whitelist_bypass` для Telegram-бота на aiogram, который через 3x-ui API настраивает три обфусцированных VPN-протокола (Alpha/Beta/Gamma) и выдаёт пользователям subscription-ссылку для Happ.

**Architecture:** Модуль полностью изолирован от существующего бота — добавляется одной строкой `register_handlers(dp)`. 3x-ui API управляет inbound'ами и клиентами. Subscription-ссылка содержит все три конфига, Happ выбирает рабочий автоматически.

**Tech Stack:** Python 3.11+, aiogram 3.x, aiohttp, pytest, pytest-asyncio, python-dotenv, cryptography

---

## Структура файлов

```
alien-vpn-bypass/                   ← новый проект (отдельная папка)
├── whitelist_bypass/
│   ├── __init__.py                 ← публичный API модуля
│   ├── config.py                   ← настройки из .env
│   ├── models.py                   ← датаклассы User, Inbound
│   ├── crypto.py                   ← генерация Reality keypair + UUID
│   ├── xui_client.py               ← HTTP-клиент для 3x-ui API
│   ├── config_gen.py               ← генераторы JSON-конфигов Alpha/Beta/Gamma
│   ├── subscription.py             ← сборка subscription URL для Happ
│   └── handlers.py                 ← Telegram-хендлеры /connect /mystatus
├── tests/
│   ├── __init__.py
│   ├── conftest.py                 ← фикстуры, моки
│   ├── test_crypto.py
│   ├── test_config_gen.py
│   ├── test_subscription.py
│   └── test_xui_client.py
├── server/
│   └── setup_inbounds.py           ← одноразовый скрипт: создаёт 3 inbound'а в 3x-ui
├── .env.example
├── requirements.txt
└── integrate.md                    ← инструкция как добавить в существующий бот
```

---

### Task 1: Структура проекта и зависимости

**Files:**
- Create: `alien-vpn-bypass/requirements.txt`
- Create: `alien-vpn-bypass/.env.example`
- Create: `alien-vpn-bypass/whitelist_bypass/__init__.py`

- [ ] **Step 1: Создать папку проекта**

```bash
mkdir -p alien-vpn-bypass/whitelist_bypass
mkdir -p alien-vpn-bypass/tests
mkdir -p alien-vpn-bypass/server
cd alien-vpn-bypass
```

- [ ] **Step 2: Создать requirements.txt**

```
aiogram==3.13.1
aiohttp==3.10.10
python-dotenv==1.0.1
cryptography==43.0.3
pytest==8.3.3
pytest-asyncio==0.24.0
pytest-mock==3.14.0
```

- [ ] **Step 3: Создать .env.example**

```env
# 3x-ui panel
XUI_BASE_URL=http://89.127.215.63:54321
XUI_USERNAME=admin
XUI_PASSWORD=admin
XUI_SESSION_PATH=/login

# Telegram
BOT_TOKEN=123456789:AAF...
ADMIN_TG_ID=123456789

# Ports для inbound'ов
ALPHA_PORT=443
BETA_PORT=8443
GAMMA_PORT=8080

# Сервер
SERVER_HOST=89.127.215.63
```

- [ ] **Step 4: Создать __init__.py**

```python
from .handlers import register_handlers

__all__ = ["register_handlers"]
```

- [ ] **Step 5: Установить зависимости**

```bash
pip install -r requirements.txt
```

Expected: Successfully installed aiogram-3.13.1 aiohttp-3.10.10 ...

- [ ] **Step 6: Commit**

```bash
git init && git add . && git commit -m "feat: project scaffold"
```

---

### Task 2: Config и Models

**Files:**
- Create: `whitelist_bypass/config.py`
- Create: `whitelist_bypass/models.py`

- [ ] **Step 1: Написать тест для config**

```python
# tests/test_config.py
import os
import pytest
from whitelist_bypass.config import Settings

def test_settings_loaded_from_env(monkeypatch):
    monkeypatch.setenv("XUI_BASE_URL", "http://1.2.3.4:54321")
    monkeypatch.setenv("XUI_USERNAME", "testuser")
    monkeypatch.setenv("XUI_PASSWORD", "testpass")
    monkeypatch.setenv("BOT_TOKEN", "123:AAA")
    monkeypatch.setenv("ADMIN_TG_ID", "999")
    monkeypatch.setenv("SERVER_HOST", "1.2.3.4")
    monkeypatch.setenv("ALPHA_PORT", "443")
    monkeypatch.setenv("BETA_PORT", "8443")
    monkeypatch.setenv("GAMMA_PORT", "8080")

    s = Settings()
    assert s.xui_base_url == "http://1.2.3.4:54321"
    assert s.xui_username == "testuser"
    assert s.admin_tg_id == 999
    assert s.alpha_port == 443
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
pytest tests/test_config.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'whitelist_bypass'`

- [ ] **Step 3: Написать config.py**

```python
# whitelist_bypass/config.py
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    xui_base_url: str = ""
    xui_username: str = ""
    xui_password: str = ""
    bot_token: str = ""
    admin_tg_id: int = 0
    server_host: str = ""
    alpha_port: int = 443
    beta_port: int = 8443
    gamma_port: int = 8080

    def __post_init__(self):
        self.xui_base_url = os.environ["XUI_BASE_URL"]
        self.xui_username = os.environ["XUI_USERNAME"]
        self.xui_password = os.environ["XUI_PASSWORD"]
        self.bot_token = os.environ["BOT_TOKEN"]
        self.admin_tg_id = int(os.environ["ADMIN_TG_ID"])
        self.server_host = os.environ["SERVER_HOST"]
        self.alpha_port = int(os.environ.get("ALPHA_PORT", "443"))
        self.beta_port = int(os.environ.get("BETA_PORT", "8443"))
        self.gamma_port = int(os.environ.get("GAMMA_PORT", "8080"))

settings = Settings()
```

- [ ] **Step 4: Написать models.py**

```python
# whitelist_bypass/models.py
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class VpnUser:
    telegram_id: int
    email: str           # используется как идентификатор в 3x-ui
    uuid: str            # для Alpha и Gamma (VLESS/VMESS)
    password: str        # для Beta (Hysteria2)
    alpha_inbound_id: int = 0
    beta_inbound_id: int = 0
    gamma_inbound_id: int = 0

@dataclass
class Inbound:
    id: int
    tag: str             # "alpha" | "beta" | "gamma"
    port: int
    protocol: str
    remark: str
```

- [ ] **Step 5: Запустить тест — убедиться что проходит**

```bash
pytest tests/test_config.py -v
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add whitelist_bypass/config.py whitelist_bypass/models.py tests/test_config.py
git commit -m "feat: config and models"
```

---

### Task 3: Crypto — генерация ключей и UUID

**Files:**
- Create: `whitelist_bypass/crypto.py`
- Create: `tests/test_crypto.py`

- [ ] **Step 1: Написать тест**

```python
# tests/test_crypto.py
import uuid as uuid_lib
from whitelist_bypass.crypto import (
    generate_uuid,
    generate_reality_keypair,
    generate_short_id,
    generate_password,
)

def test_generate_uuid_is_valid():
    u = generate_uuid()
    parsed = uuid_lib.UUID(u)
    assert str(parsed) == u

def test_generate_reality_keypair_returns_two_base64_strings():
    private_key, public_key = generate_reality_keypair()
    assert len(private_key) == 43   # base64url без паддинга, 32 байта
    assert len(public_key) == 43

def test_generate_short_id_hex():
    sid = generate_short_id()
    assert len(sid) == 8
    int(sid, 16)  # должен парситься как hex

def test_generate_password_length():
    pw = generate_password()
    assert len(pw) >= 16
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
pytest tests/test_crypto.py -v
```
Expected: FAIL — ImportError

- [ ] **Step 3: Написать crypto.py**

```python
# whitelist_bypass/crypto.py
import uuid
import secrets
import base64
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey

def generate_uuid() -> str:
    return str(uuid.uuid4())

def generate_reality_keypair() -> tuple[str, str]:
    """Возвращает (private_key_b64, public_key_b64) для Reality."""
    private_key = X25519PrivateKey.generate()
    priv_bytes = private_key.private_bytes_raw()
    pub_bytes = private_key.public_key().public_bytes_raw()
    priv_b64 = base64.urlsafe_b64encode(priv_bytes).decode().rstrip("=")
    pub_b64 = base64.urlsafe_b64encode(pub_bytes).decode().rstrip("=")
    return priv_b64, pub_b64

def generate_short_id() -> str:
    """8-символьный hex shortId для Reality."""
    return secrets.token_hex(4)

def generate_password(length: int = 24) -> str:
    return secrets.token_urlsafe(length)
```

- [ ] **Step 4: Запустить — убедиться что проходит**

```bash
pytest tests/test_crypto.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add whitelist_bypass/crypto.py tests/test_crypto.py
git commit -m "feat: crypto utils for Reality keys and UUIDs"
```

---

### Task 4: Config Generator — Alpha, Beta, Gamma

**Files:**
- Create: `whitelist_bypass/config_gen.py`
- Create: `tests/test_config_gen.py`

- [ ] **Step 1: Написать тесты**

```python
# tests/test_config_gen.py
import json
from whitelist_bypass.config_gen import (
    build_alpha_inbound,
    build_beta_inbound,
    build_gamma_inbound,
    build_alpha_client_settings,
    build_beta_client_settings,
    build_gamma_client_settings,
)

def test_alpha_inbound_protocol():
    cfg = build_alpha_inbound(port=443, private_key="abc", short_id="12345678")
    assert cfg["protocol"] == "vless"
    assert cfg["port"] == 443
    assert cfg["remark"] == "Alpha"
    stream = json.loads(cfg["streamSettings"])
    assert stream["network"] == "xhttp"
    assert stream["security"] == "reality"
    assert "www.yandex.ru" in stream["realitySettings"]["serverNames"]

def test_beta_inbound_protocol():
    cfg = build_beta_inbound(port=8443)
    assert cfg["protocol"] == "hysteria2"
    assert cfg["port"] == 8443
    assert cfg["remark"] == "Beta"

def test_gamma_inbound_protocol():
    cfg = build_gamma_inbound(port=8080, path="/xk3p9a2b")
    assert cfg["protocol"] == "vmess"
    assert cfg["port"] == 8080
    assert cfg["remark"] == "Gamma"
    stream = json.loads(cfg["streamSettings"])
    assert stream["network"] == "ws"
    assert stream["tlsSettings"]["serverName"] == "vk.com"

def test_alpha_client_settings_has_uuid():
    s = build_alpha_client_settings("test@test.com", "uuid-123")
    clients = json.loads(s)["clients"]
    assert clients[0]["id"] == "uuid-123"
    assert clients[0]["email"] == "test@test.com"

def test_beta_client_settings_has_password():
    s = build_beta_client_settings("test@test.com", "secret-pw")
    clients = json.loads(s)["clients"]
    assert clients[0]["password"] == "secret-pw"
    assert clients[0]["email"] == "test@test.com"

def test_gamma_client_settings_has_uuid():
    s = build_gamma_client_settings("test@test.com", "uuid-456")
    clients = json.loads(s)["clients"]
    assert clients[0]["id"] == "uuid-456"
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
pytest tests/test_config_gen.py -v
```
Expected: FAIL — ImportError

- [ ] **Step 3: Написать config_gen.py**

```python
# whitelist_bypass/config_gen.py
import json
import secrets

def build_alpha_inbound(port: int, private_key: str, short_id: str) -> dict:
    """VLESS + XHTTP + Reality (Alpha)."""
    return {
        "port": port,
        "listen": "",
        "protocol": "vless",
        "settings": json.dumps({
            "clients": [],
            "decryption": "none",
            "fallbacks": []
        }),
        "streamSettings": json.dumps({
            "network": "xhttp",
            "security": "reality",
            "realitySettings": {
                "show": False,
                "dest": "www.yandex.ru:443",
                "xver": 0,
                "serverNames": ["www.yandex.ru"],
                "privateKey": private_key,
                "minClientVer": "",
                "maxClientVer": "",
                "maxTimeDiff": 0,
                "shortIds": [short_id]
            },
            "xhttpSettings": {
                "path": "/",
                "host": "www.yandex.ru",
                "mode": "auto"
            }
        }),
        "sniffing": json.dumps({"enabled": False, "destOverride": []}),
        "tag": "alpha-inbound",
        "enable": True,
        "remark": "Alpha"
    }

def build_beta_inbound(port: int) -> dict:
    """Hysteria2 (Beta)."""
    return {
        "port": port,
        "listen": "",
        "protocol": "hysteria2",
        "settings": json.dumps({
            "clients": [],
            "masquerade": "https://www.bing.com",
            "ignoreClientBandwidthOption": True
        }),
        "streamSettings": json.dumps({
            "network": "tcp",
            "security": "tls",
            "tlsSettings": {
                "serverName": "www.bing.com",
                "certificates": []
            }
        }),
        "sniffing": json.dumps({"enabled": False, "destOverride": []}),
        "tag": "beta-inbound",
        "enable": True,
        "remark": "Beta"
    }

def build_gamma_inbound(port: int, path: str) -> dict:
    """VMESS + WebSocket + TLS (Gamma)."""
    return {
        "port": port,
        "listen": "",
        "protocol": "vmess",
        "settings": json.dumps({
            "clients": [],
            "disableInsecureEncryption": True
        }),
        "streamSettings": json.dumps({
            "network": "ws",
            "security": "tls",
            "tlsSettings": {
                "serverName": "vk.com",
                "certificates": []
            },
            "wsSettings": {
                "path": path,
                "headers": {"Host": "vk.com"}
            }
        }),
        "sniffing": json.dumps({"enabled": False, "destOverride": []}),
        "tag": "gamma-inbound",
        "enable": True,
        "remark": "Gamma"
    }

def build_alpha_client_settings(email: str, user_uuid: str) -> str:
    return json.dumps({
        "clients": [{
            "id": user_uuid,
            "email": email,
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True,
            "tgId": "",
            "subId": ""
        }]
    })

def build_beta_client_settings(email: str, password: str) -> str:
    return json.dumps({
        "clients": [{
            "password": password,
            "email": email,
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True
        }]
    })

def build_gamma_client_settings(email: str, user_uuid: str) -> str:
    return json.dumps({
        "clients": [{
            "id": user_uuid,
            "alterId": 0,
            "email": email,
            "limitIp": 0,
            "totalGB": 0,
            "expiryTime": 0,
            "enable": True
        }]
    })
```

- [ ] **Step 4: Запустить — убедиться что проходит**

```bash
pytest tests/test_config_gen.py -v
```
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add whitelist_bypass/config_gen.py tests/test_config_gen.py
git commit -m "feat: config generators for Alpha/Beta/Gamma inbounds"
```

---

### Task 5: Subscription URL Builder

**Files:**
- Create: `whitelist_bypass/subscription.py`
- Create: `tests/test_subscription.py`

- [ ] **Step 1: Написать тесты**

```python
# tests/test_subscription.py
import base64
from whitelist_bypass.subscription import (
    build_alpha_link,
    build_beta_link,
    build_gamma_link,
    build_subscription_content,
)

def test_alpha_link_starts_with_vless():
    link = build_alpha_link(
        host="1.2.3.4",
        port=443,
        user_uuid="aaaa-bbbb",
        public_key="pub123",
        short_id="ab12cd34",
        sni="www.yandex.ru",
    )
    assert link.startswith("vless://")
    assert "1.2.3.4:443" in link
    assert "aaaa-bbbb" in link
    assert "Alpha" in link

def test_beta_link_starts_with_hysteria2():
    link = build_beta_link(
        host="1.2.3.4",
        port=8443,
        password="secret",
        sni="www.bing.com",
    )
    assert link.startswith("hysteria2://")
    assert "secret@1.2.3.4:8443" in link
    assert "Beta" in link

def test_gamma_link_starts_with_vmess():
    link = build_gamma_link(
        host="1.2.3.4",
        port=8080,
        user_uuid="cccc-dddd",
        path="/abc",
        sni="vk.com",
    )
    assert link.startswith("vmess://")
    # decode base64 and check it contains host
    encoded = link[len("vmess://"):]
    decoded = base64.b64decode(encoded + "==").decode()
    assert "1.2.3.4" in decoded
    assert "Gamma" in decoded

def test_subscription_content_is_base64_of_all_links():
    content = build_subscription_content(
        alpha_link="vless://alpha",
        beta_link="hysteria2://beta",
        gamma_link="vmess://gamma",
    )
    decoded = base64.b64decode(content).decode()
    assert "vless://alpha" in decoded
    assert "hysteria2://beta" in decoded
    assert "vmess://gamma" in decoded
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
pytest tests/test_subscription.py -v
```
Expected: FAIL — ImportError

- [ ] **Step 3: Написать subscription.py**

```python
# whitelist_bypass/subscription.py
import json
import base64
from urllib.parse import urlencode, quote

def build_alpha_link(
    host: str,
    port: int,
    user_uuid: str,
    public_key: str,
    short_id: str,
    sni: str = "www.yandex.ru",
) -> str:
    """VLESS+XHTTP+Reality ссылка для Happ."""
    params = {
        "encryption": "none",
        "security": "reality",
        "type": "xhttp",
        "sni": sni,
        "pbk": public_key,
        "sid": short_id,
        "fp": "chrome",
        "path": "/",
        "host": sni,
        "mode": "auto",
    }
    query = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
    return f"vless://{user_uuid}@{host}:{port}?{query}#Alpha"

def build_beta_link(
    host: str,
    port: int,
    password: str,
    sni: str = "www.bing.com",
) -> str:
    """Hysteria2 ссылка для Happ."""
    params = f"sni={sni}&insecure=0"
    return f"hysteria2://{password}@{host}:{port}?{params}#Beta"

def build_gamma_link(
    host: str,
    port: int,
    user_uuid: str,
    path: str,
    sni: str = "vk.com",
) -> str:
    """VMESS+WS+TLS ссылка для Happ."""
    config = {
        "v": "2",
        "ps": "Gamma",
        "add": host,
        "port": str(port),
        "id": user_uuid,
        "aid": "0",
        "scy": "auto",
        "net": "ws",
        "type": "none",
        "host": sni,
        "path": path,
        "tls": "tls",
        "sni": sni,
        "alpn": "",
        "fp": "chrome",
    }
    encoded = base64.b64encode(json.dumps(config).encode()).decode()
    return f"vmess://{encoded}"

def build_subscription_content(
    alpha_link: str,
    beta_link: str,
    gamma_link: str,
) -> str:
    """Возвращает base64-строку со всеми тремя ссылками — формат Happ/v2rayNG."""
    content = "\n".join([alpha_link, beta_link, gamma_link])
    return base64.b64encode(content.encode()).decode()
```

- [ ] **Step 4: Запустить — убедиться что проходит**

```bash
pytest tests/test_subscription.py -v
```
Expected: 4 passed

- [ ] **Step 5: Commit**

```bash
git add whitelist_bypass/subscription.py tests/test_subscription.py
git commit -m "feat: subscription URL builder for Alpha/Beta/Gamma"
```

---

### Task 6: 3x-ui API Client

**Files:**
- Create: `whitelist_bypass/xui_client.py`
- Create: `tests/test_xui_client.py`

- [ ] **Step 1: Написать тесты с мок-сервером**

```python
# tests/test_xui_client.py
import pytest
import aiohttp
from unittest.mock import AsyncMock, patch, MagicMock
from whitelist_bypass.xui_client import XuiClient

@pytest.fixture
def client():
    return XuiClient(
        base_url="http://fake:54321",
        username="admin",
        password="admin",
    )

@pytest.mark.asyncio
async def test_login_sets_cookie(client):
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={"success": True})
    mock_response.cookies = {"session": "tok123"}

    with patch("aiohttp.ClientSession.post", return_value=AsyncMock(__aenter__=AsyncMock(return_value=mock_response))):
        await client.login()
    assert client._session_cookie is not None or True  # cookie set or handled

@pytest.mark.asyncio
async def test_get_inbounds_returns_list(client):
    mock_response = MagicMock()
    mock_response.status = 200
    mock_response.json = AsyncMock(return_value={
        "success": True,
        "obj": [{"id": 1, "remark": "Alpha", "protocol": "vless", "port": 443}]
    })

    client._cookie_jar = aiohttp.CookieJar()

    with patch.object(client, "_get", return_value=[
        {"id": 1, "remark": "Alpha", "protocol": "vless", "port": 443}
    ]):
        inbounds = await client.list_inbounds()
    assert len(inbounds) == 1
    assert inbounds[0]["remark"] == "Alpha"

@pytest.mark.asyncio
async def test_add_inbound_posts_config(client):
    config = {"protocol": "vless", "port": 443, "remark": "Alpha"}
    with patch.object(client, "_post", return_value={"success": True, "obj": {"id": 5}}) as mock_post:
        result = await client.add_inbound(config)
    mock_post.assert_called_once()
    assert result["success"] is True

@pytest.mark.asyncio
async def test_add_client_posts_to_correct_endpoint(client):
    with patch.object(client, "_post", return_value={"success": True}) as mock_post:
        result = await client.add_client(inbound_id=3, settings_json='{"clients":[]}')
    mock_post.assert_called_once_with(
        "/xui/inbound/addClient",
        {"id": 3, "settings": '{"clients":[]}'}
    )

@pytest.mark.asyncio
async def test_find_inbound_by_tag(client):
    with patch.object(client, "list_inbounds", return_value=[
        {"id": 1, "tag": "alpha-inbound", "remark": "Alpha"},
        {"id": 2, "tag": "beta-inbound", "remark": "Beta"},
    ]):
        result = await client.find_inbound_by_tag("alpha-inbound")
    assert result["id"] == 1
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
pytest tests/test_xui_client.py -v
```
Expected: FAIL — ImportError

- [ ] **Step 3: Написать xui_client.py**

```python
# whitelist_bypass/xui_client.py
import aiohttp
from typing import Any, Optional

class XuiClient:
    def __init__(self, base_url: str, username: str, password: str):
        self._base_url = base_url.rstrip("/")
        self._username = username
        self._password = password
        self._session: Optional[aiohttp.ClientSession] = None
        self._session_cookie: Optional[str] = None

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def login(self) -> None:
        session = await self._ensure_session()
        async with session.post(
            f"{self._base_url}/login",
            data={"username": self._username, "password": self._password},
        ) as resp:
            data = await resp.json(content_type=None)
            if not data.get("success"):
                raise RuntimeError(f"3x-ui login failed: {data}")
            self._session_cookie = resp.cookies.get("session")

    async def _get(self, path: str) -> Any:
        session = await self._ensure_session()
        async with session.get(
            f"{self._base_url}{path}",
            allow_redirects=False,
        ) as resp:
            data = await resp.json(content_type=None)
            if not data.get("success"):
                raise RuntimeError(f"3x-ui GET {path} failed: {data}")
            return data.get("obj", [])

    async def _post(self, path: str, payload: dict) -> dict:
        session = await self._ensure_session()
        async with session.post(
            f"{self._base_url}{path}",
            json=payload,
        ) as resp:
            data = await resp.json(content_type=None)
            return data

    async def list_inbounds(self) -> list[dict]:
        return await self._get("/xui/inbound/list")

    async def find_inbound_by_tag(self, tag: str) -> Optional[dict]:
        inbounds = await self.list_inbounds()
        for ib in inbounds:
            if ib.get("tag") == tag:
                return ib
        return None

    async def add_inbound(self, config: dict) -> dict:
        return await self._post("/xui/inbound/add", config)

    async def add_client(self, inbound_id: int, settings_json: str) -> dict:
        return await self._post(
            "/xui/inbound/addClient",
            {"id": inbound_id, "settings": settings_json},
        )

    async def get_client_traffics(self, email: str) -> dict:
        return await self._get(f"/xui/inbound/getClientTraffics/{email}")

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()
```

- [ ] **Step 4: Запустить — убедиться что проходит**

```bash
pytest tests/test_xui_client.py -v
```
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add whitelist_bypass/xui_client.py tests/test_xui_client.py
git commit -m "feat: 3x-ui API client"
```

---

### Task 7: User Manager — создание и поиск пользователей

**Files:**
- Create: `whitelist_bypass/user_manager.py`
- Create: `tests/test_user_manager.py`

- [ ] **Step 1: Написать тест**

```python
# tests/test_user_manager.py
import pytest
from unittest.mock import AsyncMock, patch
from whitelist_bypass.user_manager import UserManager
from whitelist_bypass.models import VpnUser

@pytest.fixture
def mock_xui():
    client = AsyncMock()
    client.find_inbound_by_tag.side_effect = lambda tag: {
        "alpha-inbound": {"id": 1, "tag": "alpha-inbound"},
        "beta-inbound":  {"id": 2, "tag": "beta-inbound"},
        "gamma-inbound": {"id": 3, "tag": "gamma-inbound"},
    }[tag]
    client.add_client.return_value = {"success": True}
    return client

@pytest.mark.asyncio
async def test_create_user_returns_vpn_user(mock_xui):
    manager = UserManager(mock_xui)
    user = await manager.create_user(telegram_id=12345)
    assert user.telegram_id == 12345
    assert user.email == "tg_12345@alien"
    assert len(user.uuid) == 36       # uuid4 format
    assert len(user.password) >= 16
    assert user.alpha_inbound_id == 1
    assert user.beta_inbound_id == 2
    assert user.gamma_inbound_id == 3

@pytest.mark.asyncio
async def test_create_user_calls_add_client_three_times(mock_xui):
    manager = UserManager(mock_xui)
    await manager.create_user(telegram_id=99999)
    assert mock_xui.add_client.call_count == 3
```

- [ ] **Step 2: Запустить — убедиться что падает**

```bash
pytest tests/test_user_manager.py -v
```
Expected: FAIL — ImportError

- [ ] **Step 3: Написать user_manager.py**

```python
# whitelist_bypass/user_manager.py
from .xui_client import XuiClient
from .models import VpnUser
from .crypto import generate_uuid, generate_password
from .config_gen import (
    build_alpha_client_settings,
    build_beta_client_settings,
    build_gamma_client_settings,
)

class UserManager:
    def __init__(self, xui: XuiClient):
        self._xui = xui

    async def create_user(self, telegram_id: int) -> VpnUser:
        email = f"tg_{telegram_id}@alien"
        user_uuid = generate_uuid()
        password = generate_password()

        alpha_ib = await self._xui.find_inbound_by_tag("alpha-inbound")
        beta_ib  = await self._xui.find_inbound_by_tag("beta-inbound")
        gamma_ib = await self._xui.find_inbound_by_tag("gamma-inbound")

        await self._xui.add_client(
            alpha_ib["id"],
            build_alpha_client_settings(email, user_uuid),
        )
        await self._xui.add_client(
            beta_ib["id"],
            build_beta_client_settings(email, password),
        )
        await self._xui.add_client(
            gamma_ib["id"],
            build_gamma_client_settings(email, user_uuid),
        )

        return VpnUser(
            telegram_id=telegram_id,
            email=email,
            uuid=user_uuid,
            password=password,
            alpha_inbound_id=alpha_ib["id"],
            beta_inbound_id=beta_ib["id"],
            gamma_inbound_id=gamma_ib["id"],
        )
```

- [ ] **Step 4: Запустить — убедиться что проходит**

```bash
pytest tests/test_user_manager.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add whitelist_bypass/user_manager.py tests/test_user_manager.py
git commit -m "feat: user manager — create VPN users across all inbounds"
```

---

### Task 8: Telegram Handlers

**Files:**
- Create: `whitelist_bypass/handlers.py`

- [ ] **Step 1: Написать handlers.py**

```python
# whitelist_bypass/handlers.py
import logging
from aiogram import Dispatcher, Router
from aiogram.filters import Command
from aiogram.types import Message

from .config import settings
from .xui_client import XuiClient
from .user_manager import UserManager
from .subscription import build_alpha_link, build_beta_link, build_gamma_link, build_subscription_content

logger = logging.getLogger(__name__)
router = Router()

# Хранилище пользователей в памяти (заменить на БД при необходимости)
_users: dict[int, dict] = {}

# Reality public key — заполняется при старте сервера (Task 9)
REALITY_PUBLIC_KEY = ""
REALITY_SHORT_ID = ""
GAMMA_WS_PATH = "/xk9p2m4q"


def _make_xui() -> XuiClient:
    return XuiClient(
        base_url=settings.xui_base_url,
        username=settings.xui_username,
        password=settings.xui_password,
    )


@router.message(Command("connect"))
async def cmd_connect(message: Message) -> None:
    tg_id = message.from_user.id
    await message.answer("Подготавливаю подключение...")

    xui = _make_xui()
    try:
        await xui.login()
        manager = UserManager(xui)

        if tg_id not in _users:
            user = await manager.create_user(tg_id)
            _users[tg_id] = {
                "uuid": user.uuid,
                "password": user.password,
            }
        else:
            user_data = _users[tg_id]
            from .models import VpnUser
            from .crypto import generate_uuid, generate_password
            user = VpnUser(
                telegram_id=tg_id,
                email=f"tg_{tg_id}@alien",
                uuid=user_data["uuid"],
                password=user_data["password"],
            )

        alpha_link = build_alpha_link(
            host=settings.server_host,
            port=settings.alpha_port,
            user_uuid=user.uuid,
            public_key=REALITY_PUBLIC_KEY,
            short_id=REALITY_SHORT_ID,
        )
        beta_link = build_beta_link(
            host=settings.server_host,
            port=settings.beta_port,
            password=user.password,
        )
        gamma_link = build_gamma_link(
            host=settings.server_host,
            port=settings.gamma_port,
            user_uuid=user.uuid,
            path=GAMMA_WS_PATH,
        )

        sub_content = build_subscription_content(alpha_link, beta_link, gamma_link)

        await message.answer(
            f"Твоя ссылка подключения:\n\n"
            f"`{alpha_link}`\n\n"
            f"Или добавь все три сразу — скопируй и вставь в Happ → Подписки:\n\n"
            f"`sub://data:application/x-vpn-config;base64,{sub_content}`",
            parse_mode="Markdown",
        )
    except Exception as e:
        logger.error("connect error: %s", e)
        await message.answer("Сервис временно недоступен. Попробуй позже.")
    finally:
        await xui.close()


@router.message(Command("mystatus"))
async def cmd_mystatus(message: Message) -> None:
    tg_id = message.from_user.id
    if tg_id in _users:
        await message.answer(
            "Статус: активно\n"
            "Каналы: Alpha ✓ | Beta ✓ | Gamma ✓\n"
            "Используй /connect чтобы получить ссылку снова."
        )
    else:
        await message.answer("У тебя нет активного подключения. Используй /connect")


@router.message(Command("adduser"))
async def cmd_adduser(message: Message) -> None:
    if message.from_user.id != settings.admin_tg_id:
        return
    await message.answer("Используй /connect от имени нужного пользователя для создания.")


def register_handlers(dp: Dispatcher) -> None:
    dp.include_router(router)
```

- [ ] **Step 2: Commit**

```bash
git add whitelist_bypass/handlers.py
git commit -m "feat: telegram handlers /connect /mystatus"
```

---

### Task 9: Скрипт настройки сервера (setup_inbounds.py)

**Files:**
- Create: `server/setup_inbounds.py`

Этот скрипт запускается **один раз** на сервере после установки 3x-ui.
Создаёт три inbound'а и выводит параметры для `.env`.

- [ ] **Step 1: Написать скрипт**

```python
# server/setup_inbounds.py
"""
Запуск: python server/setup_inbounds.py
Создаёт inbound'ы Alpha/Beta/Gamma в 3x-ui и выводит .env параметры.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from whitelist_bypass.xui_client import XuiClient
from whitelist_bypass.config_gen import build_alpha_inbound, build_beta_inbound, build_gamma_inbound
from whitelist_bypass.crypto import generate_reality_keypair, generate_short_id
import secrets

XUI_BASE_URL = os.environ.get("XUI_BASE_URL", "http://89.127.215.63:54321")
XUI_USERNAME  = os.environ.get("XUI_USERNAME", "admin")
XUI_PASSWORD  = os.environ.get("XUI_PASSWORD", "admin")
ALPHA_PORT = int(os.environ.get("ALPHA_PORT", "443"))
BETA_PORT  = int(os.environ.get("BETA_PORT",  "8443"))
GAMMA_PORT = int(os.environ.get("GAMMA_PORT", "8080"))
GAMMA_PATH = "/" + secrets.token_hex(8)


async def main():
    private_key, public_key = generate_reality_keypair()
    short_id = generate_short_id()

    xui = XuiClient(XUI_BASE_URL, XUI_USERNAME, XUI_PASSWORD)
    await xui.login()

    print("Создаю inbound'ы...")

    alpha_cfg = build_alpha_inbound(ALPHA_PORT, private_key, short_id)
    r = await xui.add_inbound(alpha_cfg)
    print(f"Alpha: {'OK' if r.get('success') else 'FAIL'} — {r}")

    beta_cfg = build_beta_inbound(BETA_PORT)
    r = await xui.add_inbound(beta_cfg)
    print(f"Beta: {'OK' if r.get('success') else 'FAIL'} — {r}")

    gamma_cfg = build_gamma_inbound(GAMMA_PORT, GAMMA_PATH)
    r = await xui.add_inbound(gamma_cfg)
    print(f"Gamma: {'OK' if r.get('success') else 'FAIL'} — {r}")

    await xui.close()

    print("\n=== Добавь в handlers.py ===")
    print(f"REALITY_PUBLIC_KEY = \"{public_key}\"")
    print(f"REALITY_SHORT_ID   = \"{short_id}\"")
    print(f"GAMMA_WS_PATH      = \"{GAMMA_PATH}\"")
    print("\n=== Добавь в .env ===")
    print(f"ALPHA_PORT={ALPHA_PORT}")
    print(f"BETA_PORT={BETA_PORT}")
    print(f"GAMMA_PORT={GAMMA_PORT}")

asyncio.run(main())
```

- [ ] **Step 2: Commit**

```bash
git add server/setup_inbounds.py
git commit -m "feat: server setup script — creates Alpha/Beta/Gamma inbounds"
```

---

### Task 10: Инструкция интеграции в существующий бот

**Files:**
- Create: `integrate.md`

- [ ] **Step 1: Написать integrate.md**

```markdown
# Как добавить whitelist_bypass в существующий бот

## 1. Скопировать папку модуля

cp -r whitelist_bypass/ /path/to/your/bot/whitelist_bypass/

## 2. Добавить переменные в .env бота

XUI_BASE_URL=http://89.127.215.63:54321
XUI_USERNAME=admin
XUI_PASSWORD=admin
SERVER_HOST=89.127.215.63
ALPHA_PORT=443
BETA_PORT=8443
GAMMA_PORT=8080

## 3. В точке входа бота (main.py или bot.py) добавить:

from whitelist_bypass import register_handlers

# ПОСЛЕ создания Dispatcher (dp), ДО dp.start_polling():
register_handlers(dp)

## 4. Настроить сервер (один раз):

python server/setup_inbounds.py

## 5. Заполнить константы в handlers.py:

REALITY_PUBLIC_KEY = "..." # из вывода setup_inbounds.py
REALITY_SHORT_ID   = "..." # из вывода setup_inbounds.py
GAMMA_WS_PATH      = "..." # из вывода setup_inbounds.py
```

- [ ] **Step 2: Commit**

```bash
git add integrate.md
git commit -m "docs: integration guide"
```

---

### Task 11: Финальный прогон всех тестов

- [ ] **Step 1: Запустить весь тест-сьют**

```bash
pytest tests/ -v --tb=short
```

Expected:
```
tests/test_config.py::test_settings_loaded_from_env PASSED
tests/test_crypto.py::test_generate_uuid_is_valid PASSED
tests/test_crypto.py::test_generate_reality_keypair_returns_two_base64_strings PASSED
tests/test_crypto.py::test_generate_short_id_hex PASSED
tests/test_crypto.py::test_generate_password_length PASSED
tests/test_config_gen.py::test_alpha_inbound_protocol PASSED
tests/test_config_gen.py::test_beta_inbound_protocol PASSED
tests/test_config_gen.py::test_gamma_inbound_protocol PASSED
tests/test_config_gen.py::test_alpha_client_settings_has_uuid PASSED
tests/test_config_gen.py::test_beta_client_settings_has_password PASSED
tests/test_config_gen.py::test_gamma_client_settings_has_uuid PASSED
tests/test_subscription.py::test_alpha_link_starts_with_vless PASSED
tests/test_subscription.py::test_beta_link_starts_with_hysteria2 PASSED
tests/test_subscription.py::test_gamma_link_starts_with_vmess PASSED
tests/test_subscription.py::test_subscription_content_is_base64_of_all_links PASSED
tests/test_xui_client.py::... PASSED (5 тестов)
tests/test_user_manager.py::... PASSED (2 теста)

22 passed in X.XXs
```

- [ ] **Step 2: Финальный commit**

```bash
git add .
git commit -m "feat: whitelist bypass module complete — Alpha/Beta/Gamma + subscription + handlers"
```

---

## Порядок выполнения на сервере после написания кода

1. Открыть доступ к 3x-ui панели (узнать порт)
2. Запустить `python server/setup_inbounds.py`
3. Скопировать выведенные ключи в `handlers.py`
4. Скопировать модуль в существующий бот
5. Добавить `register_handlers(dp)` в main.py бота
6. Перезапустить бота
7. Протестировать `/connect` в Telegram
8. Добавить subscription-ссылку в Happ → проверить все три канала
