import logging

from interfaces.i_sensor_repository import ISensorRepository
from interfaces.i_alert_service import IAlertService

logger = logging.getLogger("backend.services.sensor_service")


class SensorService:
    def __init__(self, repository: ISensorRepository, alert_service: IAlertService):
        self.repository = repository
        self.alert_service = alert_service

    async def process_reading(self, reading: dict) -> dict:
        logger.debug("Processing sensor reading: %s", reading)
        self._validate_reading(reading)
        saved = await self.repository.insert_reading(reading)
        await self.alert_service.check_threshold(reading)
        return saved

    async def process_batch(self, readings: list[dict]) -> list[dict]:
        logger.debug("Processing reading batch: %s", readings)
        for reading in readings:
            self._validate_reading(reading)
        saved = await self.repository.insert_batch(readings)
        for reading in readings:
            await self.alert_service.check_threshold(reading)
        return saved

    def _validate_reading(self, reading: dict):
        required = {"device_id", "sensor_type", "valor", "unidad", "timestamp"}
        missing = required - set(reading.keys())
        if missing:
            raise ValueError(f"Missing required reading fields: {', '.join(sorted(missing))}")
        if not isinstance(reading["valor"], (int, float, str)):
            raise ValueError("Reading valor must be numeric or string numeric")
        try:
            float(reading["valor"])
        except ValueError as exc:
            raise ValueError("Reading valor must be convertible to float") from exc
