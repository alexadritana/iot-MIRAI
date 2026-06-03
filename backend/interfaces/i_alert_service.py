from abc import ABC, abstractmethod


class IAlertService(ABC):
    @abstractmethod
    async def check_threshold(self, reading: dict) -> dict | None:
        raise NotImplementedError
