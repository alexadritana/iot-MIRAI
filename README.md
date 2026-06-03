# IoT MIRAI Monitoring System

IoT MIRAI es una aplicación de monitoreo de sensores que captura lecturas publicadas desde un nodo Raspberry Pi simulado, las persiste en TimescaleDB y muestra un dashboard React en tiempo real.

## Arquitectura

- Raspberry Pi simulado publica datos MQTT a Eclipse Mosquitto
- FastAPI suscribe a `iot/sensors/#`, persiste lecturas en TimescaleDB y valida alertas
- WebSocket transmite eventos de lectura y alertas al frontend React
- React + Vite muestra métricas en vivo, gráficos históricos y estado del dispositivo

## Tech Stack

- Frontend: React + Vite
- Backend: FastAPI con async/await
- Comunicación: MQTT (`paho-mqtt`) + WebSocket
- Base de datos: TimescaleDB / PostgreSQL
- Broker MQTT: Eclipse Mosquitto
- Auth: JWT + OAuth 2.0
- ORM: SQLAlchemy async

## Requisitos

- Docker y Docker Compose
- Python 3.11+
- Node.js 20+

## Ejecución con Docker

```bash
cd iot-MIRAI
docker-compose up --build
```

## Ejecución local

### Backend

```bash
cd iot-MIRAI/backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd iot-MIRAI/frontend
npm install
npm run dev -- --host 0.0.0.0
```

### Raspberry Pi Publisher

```bash
cd iot-MIRAI/raspberry
python publisher.py
```

## Arquitectura descrita

Raspberry Pi → Mosquitto → FastAPI → TimescaleDB → React

## CAP theorem

Se eligió CP (Consistency + Partition Tolerance) para priorizar la consistencia transaccional de la persistencia de lecturas y alertas.

## Principios SOLID aplicados

- S: `SensorRepository` persiste datos; `SensorService` maneja lógica de negocio; `WebSocketManager` solo administra conexiones.
- O: La arquitectura permite nuevas fuentes de sensor mediante `ISensorReader` y nuevos tipos de sensor sin modificar la lógica existente.
- L: Cualquier implementación de `ISensorReader` puede sustituir a otra sin romper el flujo.
- I: `ISensorReader` define solo lectura; `IAlertService` define solo validación de umbrales.
- D: `SensorService` depende de la abstracción `ISensorRepository` en lugar de detalles concretos.
