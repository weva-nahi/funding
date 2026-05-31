from rest_framework import serializers


class DashboardStatsSerializer(serializers.Serializer):
    total_applications = serializers.IntegerField()
    pending_applications = serializers.IntegerField()
    approved_this_month = serializers.IntegerField()
    rejected_this_month = serializers.IntegerField()
    active_clients = serializers.IntegerField()
