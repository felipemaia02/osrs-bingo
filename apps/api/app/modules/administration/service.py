from datetime import UTC, datetime
from typing import Any

from app.core.exceptions import AppException, ConflictError, NotFoundError
from app.modules.administration.repository import AdministrationRepository
from app.modules.administration.schemas import DirectoryUser, UserDirectory
from app.modules.auth.schemas import CurrentUser

ROLE_UPDATE_ATTEMPTS = 5


class AdministrationService:
    def __init__(self, repository: AdministrationRepository) -> None:
        self._repository = repository

    async def directory(self, search: str, offset: int, limit: int) -> UserDirectory:
        roles = await self._repository.roles()
        if roles is None:
            raise AppException(503, "Administration is not initialized")
        users, total = await self._repository.directory(search, offset, limit)
        return UserDirectory(
            items=[self._user(user, roles["admin_ids"]) for user in users],
            total=total,
            offset=offset,
            limit=limit,
        )

    async def change_role(self, actor: CurrentUser, user_id: str, is_admin: bool) -> DirectoryUser:
        target = await self._repository.get_user(user_id)
        if target is None:
            raise NotFoundError("User")
        for _ in range(ROLE_UPDATE_ATTEMPTS):
            roles = await self._repository.roles()
            if roles is None or actor.discord_id not in roles["admin_ids"]:
                raise AppException(403, "Administrator access required")
            admin_ids = set(roles["admin_ids"])
            already_admin = target["discord_id"] in admin_ids
            if already_admin == is_admin:
                return self._user(target, list(admin_ids))
            if is_admin:
                admin_ids.add(target["discord_id"])
            else:
                admin_ids.remove(target["discord_id"])
            if not admin_ids:
                raise ConflictError("Cannot remove the last administrator")
            audit = {
                "actor_id": actor.id,
                "target_id": user_id,
                "action": "grant_admin" if is_admin else "revoke_admin",
                "created_at": datetime.now(UTC),
            }
            if await self._repository.change_roles(roles["revision"], sorted(admin_ids), audit):
                return self._user(target, list(admin_ids))
        raise ConflictError("Administrator roles changed; try again")

    @staticmethod
    def _user(user: dict[str, Any], admin_ids: list[str]) -> DirectoryUser:
        return DirectoryUser(
            id=str(user["_id"]),
            discord_id=user["discord_id"],
            username=user["username"],
            is_admin=user["discord_id"] in admin_ids,
        )
