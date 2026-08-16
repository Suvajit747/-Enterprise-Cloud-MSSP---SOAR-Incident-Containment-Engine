import unittest
from datetime import timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import models
from app.database import Base
from app.main import get_dashboard


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=self.engine)
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
                "open_incidents": 0,
                "total_incidents": 0,
                "critical_alerts": 0,
                "successful_playbooks": 0,
                "failed_playbooks": 0,
                "automation_success_rate": None,
                "average_time_to_contain": None,
                "average_time_to_resolve": None,
                "average_time_to_contain_seconds": None,
                "average_time_to_resolve_seconds": None,
            },
        )

    def test_dashboard_returns_existing_metric_contract(self):
        critical_alert = self._alert(severity="critical", status="new")
        contained_alert = self._alert(severity="high", status="contained")
        self.db.add_all(
            [
                critical_alert,
                contained_alert,
                self._alert(severity="medium", status="investigating"),
                self._alert(severity="low", status="resolved"),
                self._alert(severity="high", status="closed"),
            ]
        )
        self.db.commit()
        self.db.refresh(critical_alert)
        self.db.refresh(contained_alert)

        incident = models.Incident(
            title="Dashboard test incident",
            description="Dashboard aggregate SQL regression test incident",
            severity="high",
            status="open",
        )
        self.db.add(incident)
        self.db.flush()
        self.db.add_all(
            [
                models.PlaybookExecution(
                    alert_id=critical_alert.id,
                    incident_id=incident.id,
                    playbook_name="Test completed playbook",
                    action="block_ip",
                    risk_score=95,
                    status="completed",
                    details={"simulated": True},
                ),
                models.PlaybookExecution(
                    alert_id=contained_alert.id,
                    incident_id=incident.id,
                    playbook_name="Test failed playbook",
                    action="isolate_endpoint",
                    risk_score=85,
                    status="failed",
                    error_message="unit-test failure",
                    details={"simulated": True},
                ),
            ]
        )
        self.db.commit()
        self.db.add(
            models.AuditEvent(
                alert_id=contained_alert.id,
                event_type="STATUS_CHANGED",
                description="contained",
                actor="test",
                timestamp=contained_alert.created_at + timedelta(seconds=60),
                event_metadata={"to_status": "contained"},
            )
        )
        self.db.commit()

        dashboard = get_dashboard(self.db)

        self.assertEqual(dashboard["total_alerts"], 5)
        self.assertEqual(dashboard["new_alerts"], 1)
        self.assertEqual(dashboard["investigating"], 1)
        self.assertEqual(dashboard["contained"], 1)
        self.assertEqual(dashboard["resolved"], 1)
        self.assertEqual(dashboard["closed"], 1)
        self.assertEqual(dashboard["critical"], 1)
        self.assertEqual(dashboard["critical_alerts"], 1)
        self.assertEqual(dashboard["high"], 2)
        self.assertEqual(dashboard["medium"], 1)
        self.assertEqual(dashboard["low"], 1)
        self.assertEqual(dashboard["automation_completed"], 3)
        self.assertEqual(dashboard["high_risk_alerts"], 3)
        self.assertEqual(dashboard["open_incidents"], 1)
        self.assertEqual(dashboard["total_incidents"], 1)
        self.assertEqual(dashboard["playbooks_executed"], 2)
        self.assertEqual(dashboard["successful_playbooks"], 1)
        self.assertEqual(dashboard["failed_playbooks"], 1)
        self.assertEqual(dashboard["automation_success_rate"], 50.0)
        self.assertEqual(dashboard["average_time_to_contain"], 60.0)
        self.assertIsNone(dashboard["average_time_to_resolve"])

    def _alert(self, severity, status):
        return models.Alert(
            source="dashboard-test",
            severity=severity,
            title=f"{severity} alert",
            description="Dashboard aggregate SQL regression test alert",
            status=status,
        )


if __name__ == "__main__":
    unittest.main()
