"""SQLAlchemy Model for hazards.
Owner: CHARAN (Backend-B)

Schema:
- id: uuid, PK
- hazard_type: text (cyclone/high_wave/lightning)
- severity: text (low/moderate/high/critical)
- geom: geometry(Polygon, 4326), nullable
- valid_from: timestamptz
- valid_until: timestamptz, nullable
- source: text
- raw_bulletin_ref: text, nullable
"""

class Hazard:
    """Placeholder model - implemented by Charan."""
    pass
