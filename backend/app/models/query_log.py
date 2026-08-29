"""SQLAlchemy Model for query_logs.
Table created by CHARAN; Written to by SRIDINESH.

Schema:
- id: uuid, PK (matches query_id)
- raw_query: text
- detected_language: text
- intent: text
- plan_json: jsonb
- evidence_json: jsonb
- role: text (fisherman/researcher/coast_guard/policymaker)
- created_at: timestamptz
"""

class QueryLog:
    """Placeholder model - table created by Charan; written to by Sridinesh's /query."""
    pass
