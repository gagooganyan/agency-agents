#!/bin/bash
# VPN Bypass Server Setup
# Domain: go1589.ru | Server: 213.239.157.6
# Run as root via hosting console

set -euo pipefail

DOMAIN="go1589.ru"
PANEL_PORT="54321"
INBOUND_PORT="443"
EMAIL="admin@${DOMAIN}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}▶${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
err() { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── 1. Deps ──────────────────────────────────────────────────────────────────
log "Installing dependencies..."
apt-get update -qq
apt-get install -y -qq curl wget python3 certbot ufw

# ── 2. Firewall ───────────────────────────────────────────────────────────────
log "Configuring firewall..."
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'ACME'
ufw allow 443/tcp  comment 'VPN inbound'
ufw allow ${PANEL_PORT}/tcp comment '3x-ui panel'
ufw allow 2096/tcp comment '3x-ui subscription'
ufw --force enable

# ── 3. Install 3x-ui ─────────────────────────────────────────────────────────
log "Installing 3x-ui..."
if ! command -v x-ui &>/dev/null; then
    bash <(curl -Ls https://raw.githubusercontent.com/MHSanaei/3x-ui/main/install.sh) <<< $'\n\n\n\n'
fi
systemctl enable x-ui
systemctl start x-ui
sleep 5

# ── 4. TLS cert via certbot ───────────────────────────────────────────────────
log "Issuing TLS cert for ${DOMAIN}..."

# Stop anything on port 80 temporarily
fuser -k 80/tcp 2>/dev/null || true
sleep 1

certbot certonly \
    --standalone \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    -d "${DOMAIN}" || err "Certbot failed. Make sure ${DOMAIN} A record points to this server IP."

CERT_PATH="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

# ── 5. Configure 3x-ui inbound via API ───────────────────────────────────────
log "Configuring XHTTP inbound..."

python3 << PYEOF
import urllib.request, urllib.parse, json, secrets, uuid, sys
import http.cookiejar

DOMAIN = "${DOMAIN}"
CERT_PATH = "${CERT_PATH}"
KEY_PATH = "${KEY_PATH}"
PANEL = "http://127.0.0.1:${PANEL_PORT}"

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

def api(path, data=None, as_json=False):
    if as_json:
        body = json.dumps(data).encode()
        req = urllib.request.Request(f"{PANEL}{path}", data=body, method='POST')
        req.add_header('Content-Type', 'application/json')
    elif data:
        body = urllib.parse.urlencode(data).encode()
        req = urllib.request.Request(f"{PANEL}{path}", data=body, method='POST')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    else:
        req = urllib.request.Request(f"{PANEL}{path}")
    resp = opener.open(req, timeout=10)
    return json.loads(resp.read())

# Login
r = api('/login', {'username': 'admin', 'password': 'admin'})
if not r.get('success'):
    print(f"Login failed: {r}", file=sys.stderr)
    sys.exit(1)

# Random path slug so URL is unguessable
path_slug = secrets.token_hex(4)
client_uuid = str(uuid.uuid4())
sub_id = secrets.token_hex(16)

stream_settings = {
    "network": "xhttp",
    "security": "tls",
    "tlsSettings": {
        "serverName": DOMAIN,
        "rejectUnknownSni": False,
        "certificates": [{
            "certificateFile": CERT_PATH,
            "keyFile": KEY_PATH
        }],
        "alpn": ["h2", "http/1.1"]
    },
    "xhttpSettings": {
        "mode": "packet-up",
        "path": f"/static/assets/runtime-{path_slug}/",
        "host": DOMAIN,
        "extra": {
            "xPaddingBytes": "100-1000",
            "noSSEHeader": False,
            "xmux": {
                "maxConcurrency": 16,
                "maxConnections": 0,
                "cMaxLifetimeMs": 300000,
                "cMaxReuseTimes": 0,
                "hMaxRequestTimes": 0,
                "hKeepAlivePeriod": 0
            }
        }
    }
}

settings = {
    "clients": [{
        "id": client_uuid,
        "email": "test",
        "flow": "",
        "limitIp": 0,
        "totalGB": 0,
        "expiryTime": 0,
        "enable": True,
        "tgId": "",
        "subId": sub_id,
        "comment": ""
    }],
    "decryption": "none"
}

inbound_data = {
    "port": 443,
    "protocol": "vless",
    "settings": json.dumps(settings),
    "streamSettings": json.dumps(stream_settings),
    "enable": "true",
    "remark": "bypass-alpha",
    "listen": "",
    "expiryTime": 0,
    "sniffing": json.dumps({
        "enabled": True,
        "destOverride": ["http", "tls", "quic"]
    }),
}

r = api('/xui/inbound/add', inbound_data)
if not r.get('success'):
    print(f"Error creating inbound: {r}", file=sys.stderr)
    sys.exit(1)

# Build vless URI (RabbitHole / v2ray format)
import urllib.parse as up
params = up.urlencode({
    "type": "xhttp",
    "security": "tls",
    "sni": DOMAIN,
    "fp": "chrome",
    "path": f"/static/assets/runtime-{path_slug}/",
    "host": DOMAIN,
    "mode": "packet-up",
    "alpn": "h2,http%2F1.1",
    "xmux": "maxConcurrency=16",
})
uri = f"vless://{client_uuid}@{DOMAIN}:443?{params}#bypass-alpha"

# Write results to file for easy copy
with open('/root/vpn_config.txt', 'w') as f:
    f.write(f"UUID: {client_uuid}\n")
    f.write(f"SubID: {sub_id}\n")
    f.write(f"Path: /static/assets/runtime-{path_slug}/\n")
    f.write(f"\nvless URI:\n{uri}\n")
    f.write(f"\nSub URL: http://${DOMAIN}:2096/{sub_id}\n")

print("\n" + "="*60)
print("  SETUP COMPLETE")
print("="*60)
print(f"\nvless URI для RabbitHole:")
print(f"\n{uri}\n")
print(f"3x-ui panel: http://213.239.157.6:${PANEL_PORT}")
print(f"Login: admin / admin")
print(f"\nПолный конфиг сохранён в /root/vpn_config.txt")
print("="*60)
print("⚠  Смени пароль в панели после входа!")
PYEOF

# ── 6. Enable subscription server in 3x-ui ───────────────────────────────────
log "Enabling subscription server on port 2096..."
python3 << PYEOF2
import urllib.request, urllib.parse, json
import http.cookiejar

PANEL = "http://127.0.0.1:${PANEL_PORT}"
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

def api(path, data=None):
    if data:
        body = urllib.parse.urlencode(data).encode()
        req = urllib.request.Request(f"{PANEL}{path}", data=body, method='POST')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    else:
        req = urllib.request.Request(f"{PANEL}{path}")
    resp = opener.open(req, timeout=10)
    return json.loads(resp.read())

api('/login', {'username': 'admin', 'password': 'admin'})

# Enable subscription server
try:
    r = api('/xui/setting/update', {
        'subEnable': 'true',
        'subPort': '2096',
        'subPath': '/',
        'subDomain': '',
        'subCertFile': '',
        'subKeyFile': '',
    })
    print(f"Subscription server: {'enabled' if r.get('success') else r}")
except Exception as e:
    print(f"Sub server config skipped: {e}")
PYEOF2

log "Done! Config saved to /root/vpn_config.txt"
