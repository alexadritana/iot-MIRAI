import asyncio
import logging
import os

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://iot:iotpass@timescaledb:5432/iotdb")

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("backend.db")

Base = declarative_base()
engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def create_database_if_needed():
    async with engine.begin() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(
                "SELECT create_hypertable('sensor_readings', 'timestamp', if_not_exists => TRUE)"
            )
            logger.info("TimescaleDB hypertable created or already exists.")
        except Exception as exc:
            logger.warning("Hypertable creation warning: %s", exc)


async def get_db_session() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
