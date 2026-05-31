"""WebSocket consumer for real-time notifications."""

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # Authenticate via query param token
        token = (
            self.scope["query_string"].decode().split("token=")[-1] if b"token=" in self.scope["query_string"] else None
        )
        if not token:
            await self.close()
            return

        user_id = await self._get_user_id(token)
        if not user_id:
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
        except Exception:
            return None
