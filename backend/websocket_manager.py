import json
import logging

from fastapi import WebSocket

logger = logging.getLogger("backend.websocket_manager")


class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected. Total connections: %s", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected. Remaining connections: %s", len(self.active_connections))

    async def broadcast(self, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        logger.debug("Broadcasting event %s to %s clients", event, len(self.active_connections))
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception as exc:
                logger.warning("Failed to send websocket message: %s", exc)
                self.disconnect(connection)
