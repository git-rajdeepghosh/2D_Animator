# Supabase access-token verification.
#
# Tokens are verified locally against the project's published JWKS, so a
# request costs no round-trip to Supabase and the backend never needs the
# project's signing secret — only the public URL.
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

# Asymmetric only. Accepting HS256 alongside a JWKS would let an attacker sign
# their own token using the (public) verifying key as the HMAC secret — the
# classic algorithm-confusion attack.
_ALGORITHMS = ["ES256", "RS256"]

# auto_error=False so a missing header reaches our handler and produces a
# consistent JSON body rather than FastAPI's default.
_bearer = HTTPBearer(auto_error=False)


class AuthError(HTTPException):
    def __init__(self, detail: str = "Not authenticated") -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


@lru_cache
def _jwk_client() -> jwt.PyJWKClient:
    """Cached JWKS client. Keys are fetched once and reused across requests."""
    return jwt.PyJWKClient(settings.supabase_jwks_url)


def verify_token(token: str) -> str:
    """Verify a Supabase access token and return its user id (`sub`).

    Raises AuthError on anything unverifiable — bad signature, wrong audience
    or issuer, expired, or malformed.
    """
    try:
        signing_key = _jwk_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=_ALGORITHMS,
            audience=settings.supabase_jwt_audience,
            issuer=settings.supabase_issuer,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise AuthError(f"Invalid token: {exc}") from exc
    except Exception as exc:  # JWKS fetch failed, etc.
        raise AuthError("Could not verify token") from exc

    user_id = claims.get("sub")
    if not user_id:
        raise AuthError("Token has no subject")
    return user_id


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """FastAPI dependency resolving the caller's Supabase user id.

    When SUPABASE_URL is unset the API runs unauthenticated and every caller is
    attributed to a single local user — see `Settings.auth_enabled`.
    """
    if not settings.auth_enabled:
        return LOCAL_DEV_USER_ID

    if credentials is None or not credentials.credentials:
        raise AuthError()
    return verify_token(credentials.credentials)


async def get_ws_user_id(websocket: WebSocket) -> str | None:
    """Resolve the user id for a WebSocket, or None if unauthenticated.

    Browsers can't set headers on a WebSocket handshake, so the token arrives
    as a query parameter instead. That does mean it can land in access logs;
    the alternative (a token as the first frame) buys little here because the
    connection is read-only progress for a job the caller already owns.
    """
    if not settings.auth_enabled:
        return LOCAL_DEV_USER_ID

    token = websocket.query_params.get("token")
    if not token:
        return None
    try:
        return verify_token(token)
    except AuthError:
        return None


# Every job created while auth is disabled is attributed here, so turning auth
# on later doesn't strand those rows behind a null owner.
LOCAL_DEV_USER_ID = "local-dev-user"
