from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


class RequestSafetyMiddleware:
    def __init__(self, app: ASGIApp, max_body_bytes: int) -> None:
        self._app = app
        self._max_body_bytes = max_body_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self._app(scope, receive, send)
            return

        async def safe_send(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["Cache-Control"] = "no-store"
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "no-referrer"
            await send(message)

        if scope["path"] == "/health":
            await self._app(scope, receive, safe_send)
            return
        headers = Headers(scope=scope)
        try:
            length = int(headers.get("content-length", "0"))
        except ValueError:
            await JSONResponse({"detail": "Invalid content length"}, 400)(scope, receive, safe_send)
            return
        if length < 0 or length > self._max_body_bytes:
            await JSONResponse({"detail": "Request body too large"}, 413)(scope, receive, safe_send)
            return
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            if len(body) + len(chunk) > self._max_body_bytes:
                await JSONResponse({"detail": "Request body too large"}, 413)(
                    scope, receive, safe_send
                )
                return
            body.extend(chunk)
            if not message.get("more_body", False):
                break

        delivered = False

        async def replay_body() -> Message:
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self._app(scope, replay_body, safe_send)
