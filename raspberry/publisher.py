import csv
import json
import logging
import os
import random
import time
from datetime import datetime

import paho.mqtt.client as mqtt

BROKER_HOST = os.getenv("MQTT_HOST", "localhost")
BROKER_PORT = int(os.getenv("MQTT_PORT", "1883"))
DEVICE_ID = "rpi-001"
OFFLINE_FILE = os.path.join(os.path.dirname(__file__), "offline_data.csv")
TOPICS = {
    "temperatura": ("iot/sensors/temperatura", "°C"),
    "humedad": ("iot/sensors/humedad", "%"),
    "movimiento": ("iot/sensors/movimiento", "state"),
}

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s: %(message)s")
logger = logging.getLogger("publisher")

client = mqtt.Client(client_id=DEVICE_ID, clean_session=True)
client.reconnect_delay_set(min_delay=1, max_delay=32)


def current_timestamp():
    return datetime.utcnow().isoformat() + "Z"


def build_payload(sensor_type: str, value, unit: str) -> dict:
    return {
        "device_id": DEVICE_ID,
        "sensor_type": sensor_type,
        "valor": value,
        "unidad": unit,
        "timestamp": current_timestamp(),
    }


def write_offline(payload: dict):
    write_header = not os.path.exists(OFFLINE_FILE)
    with open(OFFLINE_FILE, mode="a", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=["device_id", "sensor_type", "valor", "unidad", "timestamp"])
        if write_header:
            writer.writeheader()
        writer.writerow(payload)
    logger.warning("Broker unavailable, storing offline reading: %s", payload)


def flush_offline_queue():
    if not os.path.exists(OFFLINE_FILE):
        return

    logger.info("Flushing offline queue: %s", OFFLINE_FILE)
    rows = []
    try:
        with open(OFFLINE_FILE, mode="r", encoding="utf-8") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                rows.append(row)
    except Exception as exc:
        logger.error("Failed to read offline queue: %s", exc)
        return

    if not rows:
        return

    successful = []
    for row in rows:
        try:
            payload = json.dumps(row)
            result = client.publish(f"iot/sensors/{row['sensor_type']}", payload, qos=1)
            status = result.rc
            if status == mqtt.MQTT_ERR_SUCCESS:
                successful.append(row)
                logger.info("Published offline reading: %s", row)
            else:
                logger.warning("Offline publish failed with rc=%s", status)
                break
        except Exception as exc:
            logger.error("Error publishing offline reading: %s", exc)
            break

    if successful and len(successful) == len(rows):
        try:
            os.remove(OFFLINE_FILE)
            logger.info("Offline queue flushed and file removed.")
        except Exception as exc:
            logger.error("Unable to remove offline file: %s", exc)


@client.on_connect
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to MQTT broker %s:%s", BROKER_HOST, BROKER_PORT)
        client.subscribe([(topic, 1) for topic, _ in TOPICS.values()])
        flush_offline_queue()
    else:
        logger.warning("Connection failed with code %s", rc)


@client.on_disconnect
def on_disconnect(client, userdata, rc):
    logger.warning("Disconnected from MQTT broker, rc=%s", rc)


def generate_sensor_readings():
    temperatura = round(random.uniform(18.0, 35.0), 1)
    humedad = round(random.uniform(30.0, 90.0), 1)
    movimiento = random.choice([0, 1])
    return {
        "temperatura": temperatura,
        "humedad": humedad,
        "movimiento": movimiento,
    }


def publish_reading(sensor_type: str, value, unit: str):
    payload = build_payload(sensor_type, value, unit)

    if not client.is_connected():
        write_offline(payload)
        return False

    try:
        result = client.publish(f"iot/sensors/{sensor_type}", json.dumps(payload), qos=1)
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            raise RuntimeError(f"MQTT publish failed rc={result.rc}")
        logger.info("Published %s: %s", sensor_type, payload)
        return True
    except Exception as exc:
        logger.error("Publish exception for %s: %s", sensor_type, exc)
        write_offline(payload)
        return False


def run_publisher():
    backoff = 1
    client.connect_async(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    while True:
        if not client.is_connected():
            logger.warning("Broker not connected, retrying in %s seconds", backoff)
            time.sleep(backoff)
            backoff = min(backoff * 2, 32)
            try:
                client.reconnect()
            except Exception as exc:
                logger.debug("Reconnect attempt failed: %s", exc)
            continue

        readings = generate_sensor_readings()
        for sensor_type, value in readings.items():
            unit = TOPICS[sensor_type][1]
            publish_reading(sensor_type, value, unit)
        time.sleep(5)


if __name__ == "__main__":
    try:
        run_publisher()
    except KeyboardInterrupt:
        logger.info("Publisher stopped by user")
        client.loop_stop()
        client.disconnect()
