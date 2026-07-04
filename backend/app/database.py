from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from typing import AsyncGenerator
from app.config import get_settings

settings = get_settings()

# The engine is the actual connection pool to PostgreDSQL. The session is a "handle" to the database that is used to run queries. The session is created from the engine.
# pool_pre_ping=True: test each connection before using it.
engine = create_async_engine(
    settings.database_url,
    echo=settings.debug, # logs all Sql queries in development
    pool_pre_ping=True,
    pool_size=10, # max persistent connections 
    max_overflow=20, # extra connection allowed under load
)

# Session factory = creates new AsyncSession objects
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False #don't expire objects after commit
)

# Base class for all your SQLAlchemy models
class Base(DeclarativeBase):
    pass

# FastAPI dependency — yields a DB session for one request, then closes it
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()  # commit the transaction if no exceptions
        except Exception:
            await session.rollback()  # rollback the transaction on exception
            raise

'''
# Why AsyncGenerator[AsyncSession, None]
# AsyncGenerator takes two type parameters:

AsyncGenerator[YieldType, SendType]
               ↑            ↑
         what it yields   what .send() passes in
                          (None = we never send values in)
'''

# The yield here is important. FastAPI's dependency injection uses yield to mean: "give the route function this value, and after the request is done, run the code after yield." This guarantees the session is always closed even if an exception occurs — like Python's with statement, but for dependencies.