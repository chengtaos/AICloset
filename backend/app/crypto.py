"""用户 API Key 加解密。用 Fernet 对称加密，密钥由 JWT_SECRET 派生。"""

import base64
import hashlib
from cryptography.fernet import Fernet
from app.auth import JWT_SECRET

_key = base64.urlsafe_b64encode(hashlib.sha256(JWT_SECRET.encode()).digest())
_fernet = Fernet(_key)


def encrypt(value: str) -> str:
    if not value:
        return ""
    return _fernet.encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet.decrypt(token.encode()).decode()
    except Exception:
        return ""
