"""SHA256 hashing utilities."""

import hashlib


def generate_sha256(content: str) -> str:
    """Generate SHA256 hash from string content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def generate_file_hash(file_obj) -> str:
    """Generate SHA256 hash from file content."""
    sha256 = hashlib.sha256()
    for chunk in file_obj.chunks():
        sha256.update(chunk)
    file_obj.seek(0)
    return sha256.hexdigest()


def generate_opportunity_hash(title: str, url: str, amount) -> str:
    """Generate deduplication hash for funding opportunities."""
    raw = f"{title}{url}{amount}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
