"""SQLAlchemy Model for zones.
Owner: CHARAN (Backend-B)

Schema:
- id: uuid, PK
- name: text
- zone_type: text (imbl/mpa/restricted/pfz)
- geom: geometry(Polygon, 4326)
- source: text
- active: boolean
"""

class Zone:
    """Placeholder model - implemented with SQLAlchemy + GeoAlchemy2 by Charan."""
    pass
