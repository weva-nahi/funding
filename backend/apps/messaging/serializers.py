"""Messaging serializers. Plain (non-Model) serializers since the underlying
data is merged from two different models (ApplicationMessage, ConsultingMessage)
with no single backing table.
"""

from rest_framework import serializers


class UnifiedMessageSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    source = serializers.ChoiceField(choices=["application", "consulting"])
    application_id = serializers.IntegerField(allow_null=True)
    consulting_request_id = serializers.IntegerField(allow_null=True)
    sender_email = serializers.EmailField()
    sender_role = serializers.CharField()
    content = serializers.CharField(allow_blank=True)
    attachment = serializers.CharField(allow_null=True)
    attachment_name = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()


class ContactSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    email = serializers.EmailField()
    display_name = serializers.CharField()
    company = serializers.CharField(allow_blank=True)
    avatar = serializers.CharField(allow_null=True)
    last_message_preview = serializers.CharField(allow_blank=True)
    last_message_at = serializers.DateTimeField()
    unread_count = serializers.IntegerField()
