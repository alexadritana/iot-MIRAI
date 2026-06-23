import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from interfaces.i_sensor_repository import ISensorRepository
from models import Alert, Device, SensorReading

logger = logging.getLogger("backend.repositories.sensor_repository")


class SensorRepository(ISensorRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(self, device_id: str | None = None, limit: int = 100) -> list[dict]:
        query = select(SensorReading).order_by(SensorReading.timestamp.desc()).limit(limit)
        if device_id:
            query = query.where(SensorReading.device_id == device_id)

        result = await self.session.execute(query)
        readings = result.scalars().all()
        return [self._map_reading(item) for item in readings]

    async def get_by_device(self, device_id: str, limit: int = 100) -> list[dict]:
        query = (
            select(SensorReading)
            .where(SensorReading.device_id == device_id)
            .order_by(SensorReading.timestamp.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        readings = result.scalars().all()
        return [self._map_reading(item) for item in readings]

    async def insert_reading(self, reading: dict) -> dict:
        logger.debug("Persisting reading: %s", reading)
        device = await self._ensure_device_exists(reading["device_id"], reading.get("timestamp"))
        timestamp_value = reading.get("timestamp", None)
        if isinstance(timestamp_value, str):
            try:
                timestamp_value = datetime.fromisoformat(timestamp_value.replace("Z", "+00:00"))
            except ValueError:
                timestamp_value = datetime.utcnow()
        elif timestamp_value is None:
            timestamp_value = datetime.utcnow()

        sensor = SensorReading(
            device_id=reading["device_id"],
            sensor_type=reading["sensor_type"],
            valor=float(reading["valor"]),
            unidad=reading["unidad"],
            timestamp=timestamp_value,
        )
        self.session.add(sensor)
        await self.session.flush()
        return self._map_reading(sensor)

    async def insert_batch(self, readings: list[dict]) -> list[dict]:
        logger.debug("Persisting reading batch: %s", readings)
        persisted = []
        for reading in readings:
            persisted.append(await self.insert_reading(reading))
        return persisted

    async def _ensure_device_exists(self, device_id: str, last_seen_value: str | None = None) -> Device:
        query = select(Device).where(Device.id == device_id).options(selectinload(Device.alerts))
        result = await self.session.execute(query)
        device = result.scalar_one_or_none()
        if not device:
            device = Device(id=device_id, name=device_id, status="connected")
            self.session.add(device)
        else:
            device.status = "connected"
        if last_seen_value:
            try:
                device.last_seen = datetime.fromisoformat(last_seen_value.replace("Z", "+00:00"))
            except Exception:
                device.last_seen = datetime.utcnow()
        else:
            device.last_seen = datetime.utcnow()
        await self.session.flush()
        return device

    @staticmethod
    def _map_reading(sensor: SensorReading) -> dict:
        return {
            "id": str(sensor.id),
            "device_id": sensor.device_id,
            "sensor_type": sensor.sensor_type,
            "valor": sensor.valor,
            "unidad": sensor.unidad,
            "timestamp": sensor.timestamp.isoformat() if sensor.timestamp else None,
        }
