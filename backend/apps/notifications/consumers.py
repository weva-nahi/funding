"""WebSocket consumer for real-time notifications."""

import logging
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # Robust token extraction — handles any ordering of query params.
        params = parse_qs(self.scope["query_string"].decode())
        token = params.get("token", [None])[0]

        if not token:
            logger.info("NotificationConsumer: closing — no token in query string.")
            await self.close()
            return

        user_id = await self._get_user_id(token)
        if not user_id:
            logger.info("NotificationConsumer: closing — token invalid or expired.")
            await self.close()
            return

        self.user_id = user_id
        self.group_name = f"notifications_{user_id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_notification(self, event):
        await self.send_json(event["notification"])

    @database_sync_to_async
    def _get_user_id(self, token_str):
        try:
            token = AccessToken(token_str)
            return token["user_id"]
        except Exception as exc:  # noqa: BLE001
            logger.info("NotificationConsumer: token decode failed: %s", exc)
            return None