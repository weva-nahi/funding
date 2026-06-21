"""Mauritania detection and city-extraction helpers.

All scrapers funnel through is_mauritania_project() and extract_mauritania_city()
so the "only Mauritania" filtering logic lives in exactly one place instead of
being duplicated (and drifting) across seven separate scraper modules.
"""

import re

# Mauritania appears under various spellings/languages across funder sites.
MAURITANIA_ALIASES = [
    "mauritania",
    "mauritanie",
    "موريتانيا",
    "islamic republic of mauritania",
    "république islamique de mauritanie",
    "mrt",  # ISO3 code, used in some facets/APIs
]

# Known Mauritanian cities/regions, used to extract a "city" value from free
# text (titles, descriptions, country fields that include a locality).
# Ordered roughly by population / how often they appear in funding docs.
MAURITANIA_CITIES = [
    "Nouakchott",
    "Nouadhibou",
    "Rosso",
    "Kaédi",
    "Kaedi",
    "Zouérat",
    "Zouerate",
    "Atar",
    "Néma",
    "Nema",
    "Sélibaby",
    "Selibaby",
    "Aleg",
    "Akjoujt",
    "Boutilimit",
    "Kiffa",
    "Aioun",
    "Tidjikja",
    "Chinguetti",
    "Tichit",
    "Boghé",
    "Boghe",
    "Magta-Lahjar",
]

_CITY_PATTERN = re.compile(
    "|".join(re.escape(c) for c in MAURITANIA_CITIES), re.IGNORECASE
)


def is_mauritania_project(*texts: str) -> bool:
    """Return True if any of the given text fields reference Mauritania.

    Pass every relevant field a scraper has (title, country, description,
    metadata values) — the check is a simple case-insensitive substring
    match against MAURITANIA_ALIASES, which is robust enough for the kind
    of country fields funder databases actually expose.
    """
    combined = " ".join(t for t in texts if t).lower()
    if not combined:
        return False
    return any(alias in combined for alias in MAURITANIA_ALIASES)


def extract_mauritania_city(*texts: str) -> str:
    """Best-effort extraction of which Mauritanian city/region a project
    targets, by scanning the given text fields for a known locality name.

    Returns '' if no known city is found — many projects are described at
    national level only, which is expected and not an error.
    """
    combined = " ".join(t for t in texts if t)
    if not combined:
        return ""
    match = _CITY_PATTERN.search(combined)
    if not match:
        return ""
    # Normalize accented/unaccented duplicates to a single canonical spelling.
    found = match.group(0)
    canonical = {
        "kaedi": "Kaédi",
        "zouerate": "Zouérat",
        "nema": "Néma",
        "selibaby": "Sélibaby",
        "boghe": "Boghé",
    }
    return canonical.get(found.lower(), found.title() if found.islower() else found)