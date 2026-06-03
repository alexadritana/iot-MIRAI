import logging

from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..interfaces.i_alert_service import IAlertService
from ..models import Alert

logger = logging.getLogger("backend.services.alert_service")


class AlertService(IAlertService):
    def __init__(self, session: AsyncSession, websocket_manager):
        self.session = session
        self.websocket_manager = websocket_manager

    async def check_threshold(self, reading: dict) -> dict | None:
        sensor_type = reading.get("sensor_type")
        valor = float(reading.get("valor", 0))
        threshold = None
        triggered = False

        if sensor_type == "temperatura" and valor > 30.0:
            threshold = 30.0
            triggered = True
        elif sensor_type == "humedad" and valor > 80.0:
            threshold = 80.0
            triggered = True
        elif sensor_type == "movimiento" and int(valor) == 1:
            threshold = 1.0
            triggered = True

        if not triggered:
            return None

        alert_data = {
            "device_id": reading["device_id"],
            "sensor_type": sensor_type,
            "valor": valor,
            "threshold": threshold,
        }
        try:
            await self._persist_alert(alert_data)
            await self.websocket_manager.broadcast("alert_triggered", alert_data)
            logger.info("Alert triggered: %s", alert_data)
            return alert_data
        except Exception as exc:
            logger.error("Failed to persist alert: %s", exc)
            return None

    async def _persist_alert(self, alert_data: dict):
        stmt = insert(Alert).values(
            device_id=alert_data["device_id"],
            sensor_type=alert_data["sensor_type"],
            valor=alert_data["valor"],
            threshold=alert_data["threshold"],
        )
        await self.session.execute(stmt)
        await self.session.flush()
