import unittest

from sqlalchemy import create_engine, inspect

from app import models
from app.database import Base


class DatabaseIndexTests(unittest.TestCase):
    def test_alert_table_has_query_indexes(self):
        engine = create_engine("sqlite:///:memory:")
        try:
            Base.metadata.create_all(bind=engine, tables=[models.Alert.__table__])

            index_names = {
                index["name"]
                for index in inspect(engine).get_indexes("alerts")
            }

            self.assertIn("ix_alerts_status_created_at", index_names)
            self.assertIn("ix_alerts_severity_created_at", index_names)
            self.assertIn("ix_alerts_source_created_at", index_names)
            self.assertIn("ix_alerts_created_at", index_names)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
