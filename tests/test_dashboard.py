import unittest

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app import models
from app.database import Base
from app.main import get_dashboard


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine, tables=[models.Alert.__table__])
        session_factory = sessionmaker(bind=self.engine)
        self.db = session_factory()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_dashboard_returns_zero_counts_when_no_alerts_exist(self):
        self.assertEqual(
            get_dashboard(self.db),
            {
                "total_alerts": 0,
                "new_alerts": 0,
                "investigating": 0,
                "contained": 0,
                "resolved": 0,
                "closed": 0,
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "automation_completed": 0,
                "high_risk_alerts": 0,
                "playbooks_executed": 0,
            },
        )

    def test_dashboard_returns_existing_metric_contract(self):
        self.db.add_all(
            [
                self._alert(severity="critical", status="new"),
                self._alert(severity="high", status="contained"),
                self._alert(severity="medium", status="investigating"),
                self._alert(severity="low", status="resolved"),
                self._alert(severity="high", status="closed"),
            ]
        )
        self.db.commit()

        dashboard, select_count = self._get_dashboard_with_select_count()

        self.assertEqual(
            dashboard,
            {
                "total_alerts": 5,
                "new_alerts": 1,
                "investigating": 1,
                "contained": 1,
                "resolved": 1,
                "closed": 1,
                "critical": 1,
                "high": 2,
                "medium": 1,
                "low": 1,
                "automation_completed": 3,
                "high_risk_alerts": 3,
                "playbooks_executed": 3,
            },
        )
        self.assertEqual(select_count, 1)

    def _alert(self, severity, status):
        return models.Alert(
            source="dashboard-test",
            severity=severity,
            title=f"{severity} alert",
            description="Dashboard aggregate SQL regression test alert",
            status=status,
        )

    def _get_dashboard_with_select_count(self):
        select_count = 0

        def count_selects(conn, cursor, statement, parameters, context, executemany):
            nonlocal select_count
            if statement.lstrip().upper().startswith("SELECT"):
                select_count += 1

        event.listen(self.engine, "before_cursor_execute", count_selects)
        try:
            return get_dashboard(self.db), select_count
        finally:
            event.remove(self.engine, "before_cursor_execute", count_selects)


if __name__ == "__main__":
    unittest.main()
