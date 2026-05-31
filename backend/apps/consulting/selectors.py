from .models import ConsultingRequest


def get_user_requests(*, user):
    return ConsultingRequest.objects.filter(user=user).order_by("-created_at")


def get_all_requests(*, status=None, priority=None):
    qs = ConsultingRequest.objects.select_related("user", "user__profile").all()
    if status:
        qs = qs.filter(status=status)
    if priority:
        qs = qs.filter(priority=priority)
    return qs.order_by("-created_at")


def get_request_by_id(*, request_id):
    return ConsultingRequest.objects.select_related("user", "user__profile", "responded_by").get(id=request_id)
