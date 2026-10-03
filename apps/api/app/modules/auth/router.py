from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse

from app.core.config import settings
from app.core.exceptions import AppException
from app.modules.auth.dependencies import (
    SESSION_COOKIE,
    STATE_COOKIE,
    AuthServiceDependency,
    UserDependency,
    require_trusted_origin,
)
from app.modules.auth.schemas import CurrentUser
from app.modules.auth.service import SESSION_MAX_AGE, STATE_MAX_AGE
from app.modules.security.dependencies import limit_authentication

router = APIRouter(prefix="/auth", tags=["auth"])


def set_auth_cookie(response: Response, key: str, value: str, max_age: int) -> None:
    response.set_cookie(
        key,
        value,
        max_age=max_age,
        httponly=True,
        secure=settings.app_env != "development",
        samesite="lax",
        path="/auth" if key == STATE_COOKIE else "/",
    )


@router.get("/discord/login", dependencies=[Depends(limit_authentication)])
async def login(service: AuthServiceDependency) -> RedirectResponse:
    try:
        url, state = await service.start_login()
    except AppException as exc:
        if exc.status_code != 503:
            raise
        response = RedirectResponse(
            f"{settings.frontend_url.rstrip('/')}/login?login=unavailable", 303
        )
        response.headers["Cache-Control"] = "no-store"
        return response
    response = RedirectResponse(url, status_code=303)
    response.headers["Cache-Control"] = "no-store"
    set_auth_cookie(response, STATE_COOKIE, state, STATE_MAX_AGE)
    return response


@router.get("/discord/callback", dependencies=[Depends(limit_authentication)])
async def callback(
    request: Request,
    service: AuthServiceDependency,
    code: str = "",
    state: str = "",
    error: str | None = None,
) -> RedirectResponse:
    try:
        if error or not code:
            raise AppException(400, "Discord login failed")
        token = await service.complete_login(code, state, request.cookies.get(STATE_COOKIE, ""))
    except AppException:
        response = RedirectResponse(f"{settings.frontend_url.rstrip('/')}/login?login=failed", 303)
    else:
        await service.logout(request.cookies.get(SESSION_COOKIE))
        response = RedirectResponse(f"{settings.frontend_url.rstrip('/')}/login", 303)
        set_auth_cookie(response, SESSION_COOKIE, token, SESSION_MAX_AGE)
    response.delete_cookie(STATE_COOKIE, path="/auth")
    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@router.get("/me", response_model=CurrentUser)
async def me(user: UserDependency, response: Response) -> CurrentUser:
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post(
    "/logout",
    status_code=204,
    dependencies=[Depends(require_trusted_origin), Depends(limit_authentication)],
)
async def logout(request: Request, service: AuthServiceDependency) -> Response:
    await service.logout(request.cookies.get(SESSION_COOKIE))
    response = Response(status_code=204)
    response.delete_cookie(SESSION_COOKIE)
    response.headers["Cache-Control"] = "no-store"
    return response
