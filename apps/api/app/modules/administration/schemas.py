from pydantic import BaseModel, ConfigDict, StrictBool


class DirectoryUser(BaseModel):
    id: str
    discord_id: str
    username: str
    is_admin: bool


class UserDirectory(BaseModel):
    items: list[DirectoryUser]
    total: int
    offset: int
    limit: int


class RoleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_admin: StrictBool
