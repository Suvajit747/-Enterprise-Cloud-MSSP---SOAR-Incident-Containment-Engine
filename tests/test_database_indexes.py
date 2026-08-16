import unittest

from sqlalchemy import create_engine, inspect

from app import models
from app.database import Base


class DatabaseIndexTests(unittest.TestCase):
    def test_tables_have_query_indexes(self):
        engine = create_engine("sqlite:///:memory:")
        try:
            Base.metadata.create_all(bind=engine)

            alert_index_names = {
                index["name"]
                for index in inspect(engine).get_indexes("alerts")
            }
            incident_index_names = {
                index["name"]
                for index in inspect(engine).get_indexes("incidents")
            }
            audit_event_index_names = {
                index["name"]
                for index in inspect(engine).get_indexes("audit_events")
            }
            execution_index_names = {
                index["name"]
                for index in inspect(engine).get_indexes("playbook_executions")
            }

            self.assertIn("ix_alerts_status_created_at", alert_index_names)
            self.assertIn("ix_alerts_severity_created_at", alert_index_names)
            self.assertIn("ix_alerts_source_created_at", alert_index_names)
            self.assertIn("ix_alerts_created_at", alert_index_names)
            self.assertIn("ix_alerts_fingerprint", alert_index_names)
            self.assertIn("ix_alerts_incident_id", alert_index_names)
            self.assertIn("ix_incidents_status_created_at", incident_index_names)
            self.assertIn("ix_incidents_severity_created_at", incident_index_names)
            self.assertIn("ix_audit_events_alert_timestamp", audit_event_index_names)
            self.assertIn("ix_audit_events_incident_timestamp", audit_event_index_names)
            self.assertIn(
                "ix_playbook_executions_alert_started_at",
                execution_index_names,
            )
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
