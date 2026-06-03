from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, List


class ISensorRepository(ABC):
    @abstractmethod
    async def get_all(self, device_id: str | None = None, limit: int = 100) -> List[dict]:
        raise NotImplementedError

    @abstractmethod
    async def get_by_device(self, device_id: str, limit: int = 100) -> List[dict]:
        raise NotImplementedError

    @abstractmethod
    async def insert_reading(self, reading: dict) -> dict:
        raise NotImplementedError

    @abstractmethod
    async def insert_batch(self, readings: list[dict]) -> list[dict]:
        raise NotImplementedError
