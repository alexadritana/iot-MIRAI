from abc import ABC, abstractmethod


class ISensorReader(ABC):
    @abstractmethod
    async def read(self) -> dict:
        raise NotImplementedError
