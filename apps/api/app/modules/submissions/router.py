import re
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile, status
from fastapi.responses import RedirectResponse, Response

from app.core.config import settings
from app.core.storage import ScreenshotStorage
from app.modules.auth.dependencies import AdminDependency, UserDependency
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import MAX_BOARD_POSITIONS
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.submissions.repository import SubmissionRepository
from app.modules.submissions.schemas import (
    NOTE_MAX_LENGTH,
    OwnSubmissionsResponse,
    ReviewQueueQuery,
    ReviewQueueResponse,
    SubmissionKind,
    SubmissionReject,
    SubmissionResponse,
)
from app.modules.submissions.service import SubmissionService
from app.modules.teams.repository import TeamRepository

# Matched by RequestSafetyMiddleware to allow screenshot-sized bodies on this route only.
UPLOAD_PATH_PATTERN = re.compile(r"/events/[^/]+/submissions")
MULTIPART_OVERHEAD_BYTES = 64 * 1024

player_router = APIRouter(tags=["submissions"])
admin_router = APIRouter(prefix="/admin", tags=["submissions"])


async def get_submission_service(request: Request) -> SubmissionService:
    database = request.app.state.db_client.database
    storage: ScreenshotStorage = request.app.state.screenshot_storage
    return SubmissionService(
        SubmissionRepository(database),
        EventRepository(database),
        PlayerRepository(database),
        TeamRepository(database),
        BoardRepository(database),
        storage,
        settings,
    )


SubmissionServiceDependency = Annotated[SubmissionService, Depends(get_submission_service)]


@player_router.post(
    "/events/{event_id}/submissions",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit(
    event_id: str,
    user: UserDependency,
    service: SubmissionServiceDependency,
    kind: Annotated[SubmissionKind, Form()],
    position: Annotated[int, Form(ge=1, le=MAX_BOARD_POSITIONS)],
    screenshot: Annotated[UploadFile, File()],
    drop_key: Annotated[str | None, Form(max_length=120)] = None,
    note: Annotated[str | None, Form(max_length=NOTE_MAX_LENGTH)] = None,
) -> SubmissionResponse:
    data = await screenshot.read(settings.max_screenshot_bytes + 1)
    return await service.submit(event_id, user, kind, position, drop_key, note, data)


@player_router.get("/events/{event_id}/submissions/me", response_model=OwnSubmissionsResponse)
async def own_submissions(
    event_id: str, user: UserDependency, service: SubmissionServiceDependency
) -> OwnSubmissionsResponse:
    return await service.own(event_id, user)


@player_router.get("/submissions/{submission_id}/screenshot")
async def screenshot(
    submission_id: str, user: UserDependency, service: SubmissionServiceDependency
) -> Response:
    url, data, content_type = await service.screenshot(submission_id, user)
    if url is not None:
        return RedirectResponse(url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "private, no-store"},
    )


@admin_router.get("/events/{event_id}/submissions", response_model=ReviewQueueResponse)
async def review_queue(
    event_id: str,
    admin: AdminDependency,
    service: SubmissionServiceDependency,
    query: Annotated[ReviewQueueQuery, Query()],
) -> ReviewQueueResponse:
    return await service.queue(event_id, query, admin)


@admin_router.post("/submissions/{submission_id}/accept", response_model=SubmissionResponse)
async def accept(
    submission_id: str, admin: AdminDependency, service: SubmissionServiceDependency
) -> SubmissionResponse:
    return await service.accept(submission_id, admin)


@admin_router.post("/submissions/{submission_id}/reject", response_model=SubmissionResponse)
async def reject(
    submission_id: str,
    payload: SubmissionReject,
    admin: AdminDependency,
    service: SubmissionServiceDependency,
) -> SubmissionResponse:
    return await service.reject(submission_id, payload, admin)
