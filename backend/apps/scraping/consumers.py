"""WebSocket consumer for real-time scraping progress (admins only)."""

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken


class ScrapingConsumer(AsyncJsonWebsocketConsumer):
    GROUP_NAME = "scraping_progress"

    async def connect(self):
        query = self.scope["query_string"].decode()
        token = query.split("token=")[-1] if "token=" in query else None
        if not token:
            await self.close()
            return

        role = await self._get_role(token)
        if role != "admin":
            await self.close()
            return

        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def scraping_update(self, event):
        await self.send_json({"type": "scraping_update", "data": event["data"]})

    @database_sync_to_async
    def _get_role(self, token_str):
        try:
            token = AccessToken(token_str)
            return token.get("role")
        except Exception:  # noqa: BLE001
            return None