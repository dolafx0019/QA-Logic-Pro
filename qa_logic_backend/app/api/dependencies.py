from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import AsyncSessionLocal

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to provide a database session for requests.
    Used for History generation later.
    """
    async with AsyncSessionLocal() as session:
        yield session
