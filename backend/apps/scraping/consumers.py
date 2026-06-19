"""WebSocket consumer for real-time scraping progress (admins only)."""

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


class ScrapingConsumer(AsyncJsonWebsocketConsumer):
    GROUP_NAME = "scraping_progress"

    async def connect(self):
        # Robust token extraction — handles any ordering of query params.
        params = parse_qs(self.scope["query_string"].decode())
        token = params.get("token", [None])[0]

        if not token:
            logger.info("ScrapingConsumer: closing — no token in query string.")
            await self.close()
            return

        role = await self._get_role(token)
        if role is None:
            logger.info("ScrapingConsumer: closing — token invalid or expired.")
            await self.close()
            return
        if role != "admin":
            logger.info("ScrapingConsumer: closing — role '%s' is not admin.", role)
            await self.close()
            return

        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "channel_name"):
            await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def scraping_update(self, event):
        await self.send_json({"type": "scraping_update", "data": event["data"]})

    @database_sync_to_async
    def _get_role(self, token_str):
        try:
            token = AccessToken(token_str)
            return token.get("role")
        except Exception as exc:  # noqa: BLE001
            logger.info("ScrapingConsumer: token decode failed: %s", exc)
            return None