from pydantic import BaseModel


class CurrentUser(BaseModel):
    id: str
    discord_id: str
    username: str
    is_admin: bool
