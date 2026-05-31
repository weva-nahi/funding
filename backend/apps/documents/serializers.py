from rest_framework import serializers

from .models import ApplicationDocument


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationDocument
        fields = ["id", "original_filename", "file_type", "file_size", "validation_status", "created_at"]


class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    application_id = serializers.IntegerField()
