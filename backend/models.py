import uuid
from datetime import datetime

from sqlalchemy import TIMESTAMP, Column, Enum, Float, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db import Base


def gen_uuid():
    return str(uuid.uuid4())


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    device_id = Column(String(128), nullable=False, index=True)
    sensor_type = Column(String(64), nullable=False, index=True)
    valor = Column(Float, nullable=False)
    unidad = Column(String(32), nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), primary_key=True, nullable=False, server_default=text("now()"))


class Device(Base):
    __tablename__ = "devices"

    id = Column(String(128), primary_key=True)
    name = Column(String(128), nullable=False)
    status = Column(String(32), nullable=False, default="disconnected")
    last_seen = Column(TIMESTAMP(timezone=True), nullable=True)
    alerts = relationship("Alert", back_populates="device")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    device_id = Column(String(128), ForeignKey("devices.id"), nullable=False)
    sensor_type = Column(String(64), nullable=False)
    valor = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    triggered_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    device = relationship("Device", back_populates="alerts")
