import asyncio
import json
import logging
import os
from datetime import datetime, timedelta

import paho.mqtt.client as mqtt
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import SessionLocal, create_database_if_needed, engine
from models import Alert, Device
from repositories.sensor_repository import SensorRepository
from services.alert_service import AlertService
from services.sensor_service import SensorService
from websocket_manager import WebSocketManager

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("backend.main")

MQTT_HOST = os.getenv("MQTT_HOST", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

app = FastAPI(title="IoT MIRAI Monitoring API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
LOOP: asyncio.AbstractEventLoop | None = None
MQTT_CLIENT: mqtt.Client | None = None


def authenticate_user(username: str, password: str) -> bool:
    return username == "admin" and password == "admin123"


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username != "admin":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return {"username": username}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


@app.middleware("http")
async def jwt_middleware(request: Request, call_next):
    if request.method == "OPTIONS" or request.url.path in ["/auth/token", "/ws"] or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi.json"):
        return await call_next(request)
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Missing or invalid authorization header"})
    token = authorization.split(" ", 1)[1]
    try:
        jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Invalid token"})
    return await call_next(request)


@app.on_event("startup")
async def startup_event():
    global LOOP, MQTT_CLIENT
    LOOP = asyncio.get_event_loop()
    app.state.ws_manager = WebSocketManager()
    await create_database_if_needed()
    MQTT_CLIENT = mqtt.Client(client_id="backend-subscriber", clean_session=True)
    MQTT_CLIENT.on_connect = on_connect
    MQTT_CLIENT.on_message = on_message
    MQTT_CLIENT.on_disconnect = on_disconnect
    MQTT_CLIENT.connect_async(MQTT_HOST, MQTT_PORT, keepalive=60)
    MQTT_CLIENT.loop_start()
    logger.info("Backend startup complete, MQTT subscriber started")


@app.on_event("shutdown")
async def shutdown_event():
    if MQTT_CLIENT:
        MQTT_CLIENT.loop_stop()
        MQTT_CLIENT.disconnect()
        logger.info("MQTT client disconnected")


@app.post("/auth/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if not authenticate_user(form_data.username, form_data.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/readings")
async def get_readings(device_id: str | None = None, limit: int = 100, token: str = Depends(oauth2_scheme)):
    async with SessionLocal() as session:
        repository = SensorRepository(session)
        return await repository.get_all(device_id=device_id, limit=limit)


@app.get("/devices")
async def get_devices(token: str = Depends(oauth2_scheme)):
    async with SessionLocal() as session:
        result = await session.execute(select(Device))
        devices = result.scalars().all()
        return [
            {
                "id": device.id,
                "name": device.name,
                "status": device.status,
                "last_seen": device.last_seen.isoformat() if device.last_seen else None,
            }
            for device in devices
        ]


@app.get("/alerts")
async def get_alerts(token: str = Depends(oauth2_scheme)):
    async with SessionLocal() as session:
        result = await session.execute(select(Alert).order_by(Alert.triggered_at.desc()).limit(50))
        alerts = result.scalars().all()
        return [
            {
                "id": str(alert.id),
                "device_id": alert.device_id,
                "sensor_type": alert.sensor_type,
                "valor": alert.valor,
                "threshold": alert.threshold,
                "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
            }
            for alert in alerts
        ]


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await app.state.ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        app.state.ws_manager.disconnect(websocket)


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Subscribed to MQTT topics on connect")
        client.subscribe([("iot/sensors/#", 1)])
    else:
        logger.warning("MQTT connect failed with rc=%s", rc)


def on_disconnect(client, userdata, rc):
    logger.warning("MQTT disconnected with rc=%s", rc)


def on_message(client, userdata, msg):
    if not LOOP:
        logger.error("AsyncIO loop is not initialized")
        return
    payload = msg.payload.decode("utf-8", errors="replace")
    logger.debug("Received MQTT message on %s: %s", msg.topic, payload)
    asyncio.run_coroutine_threadsafe(handle_message(payload, msg.topic), LOOP)


async def handle_message(raw_payload: str, topic: str | None = None):
    try:
        payload = json.loads(raw_payload)
        if isinstance(payload, list):
            await _process_batch(payload)
        else:
            await _process_single(payload)
    except json.JSONDecodeError:
        logger.warning("Ignoring invalid JSON from MQTT topic %s: %s", topic, raw_payload)
    except Exception as exc:
        logger.exception("Failed to process incoming MQTT message")
        await app.state.ws_manager.broadcast("reading_error", {"error": str(exc)})


async def _process_single(payload: dict):
    async with SessionLocal() as session:
        async with session.begin():
            repository = SensorRepository(session)
            alert_service = AlertService(session, app.state.ws_manager)
            sensor_service = SensorService(repository, alert_service)
            saved = await sensor_service.process_reading(payload)
            await app.state.ws_manager.broadcast("reading_ok", saved)


async def _process_batch(payloads: list[dict]):
    async with SessionLocal() as session:
        async with session.begin():
            repository = SensorRepository(session)
            alert_service = AlertService(session, app.state.ws_manager)
            sensor_service = SensorService(repository, alert_service)
            saved = await sensor_service.process_batch(payloads)
            await app.state.ws_manager.broadcast("reading_ok", {"batch": saved})
