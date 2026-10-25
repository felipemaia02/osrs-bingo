from pydantic import BaseModel


class SiteStatus(BaseModel):
    maintenance: bool
    message: str | None
