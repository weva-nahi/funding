import pytest

from apps.opportunities.services import create_opportunity, publish_opportunity


@pytest.mark.django_db
def test_create_opportunity(admin_user):
    opp = create_opportunity(
        title="Test Grant",
        source="GEF",
        description="A great opportunity",
        created_by=admin_user,
    )
    assert opp.title == "Test Grant"
    assert opp.status == "draft"
    assert opp.source == "GEF"


@pytest.mark.django_db
def test_publish_opportunity(admin_user):
    opp = create_opportunity(
        title="To be published",
        source="GCF",
        created_by=admin_user,
    )
    assert opp.status == "draft"
    published_opp = publish_opportunity(opportunity=opp, user=admin_user)
    assert published_opp.status == "published"
    assert published_opp.published_at is not None
