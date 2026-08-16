import unittest

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app import threat_intelligence as threat_intelligence_module
from app.database import Base
from app.main import app, get_db
from app.playbook import PlaybookEngine
from app.services.playbook_service import PlaybookExecutionService
from app.threat_intelligence import ThreatIntelligenceService


class ApiWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
        )

        def override_get_db():
            db = self.session_factory()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.original_virustotal_key = threat_intelligence_module.VIRUSTOTAL_API_KEY
        self.original_abuseipdb_key = threat_intelligence_module.ABUSEIPDB_API_KEY
        threat_intelligence_module.VIRUSTOTAL_API_KEY = None
        threat_intelligence_module.ABUSEIPDB_API_KEY = None
        ThreatIntelligenceService.VIRUSTOTAL_CACHE.clear()
        ThreatIntelligenceService.ABUSEIPDB_CACHE.clear()
        self.client = TestClient(app)

    def tearDown(self):
        threat_intelligence_module.VIRUSTOTAL_API_KEY = self.original_virustotal_key
        threat_intelligence_module.ABUSEIPDB_API_KEY = self.original_abuseipdb_key
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_incident_crud_and_alert_relationship(self):
        alert = self._create_alert()
        incident_response = self.client.post(
            "/incidents",
            json={
                "title": "Credential attack investigation",
                "description": "Multiple related alerts require investigation.",
                "severity": "high",
                "status": "open",
                "assignee": "analyst-1",
            },
        )
        self.assertEqual(incident_response.status_code, 201)
        incident = incident_response.json()
        self.assertEqual(incident["status"], "open")
        self.assertEqual(incident["alerts"], [])

        associate_response = self.client.post(
            f"/incidents/{incident['id']}/alerts/{alert['id']}"
        )
        self.assertEqual(associate_response.status_code, 200)
        linked_incident = associate_response.json()
        self.assertEqual(linked_incident["alerts"][0]["id"], alert["id"])

        fetched_incident = self.client.get(f"/incidents/{incident['id']}").json()
        self.assertEqual(fetched_incident["alerts"][0]["incident_id"], incident["id"])

        update_response = self.client.patch(
            f"/incidents/{incident['id']}",
            json={"status": "contained", "assignee": "analyst-2"},
        )
        self.assertEqual(update_response.status_code, 200)
        updated_incident = update_response.json()
        self.assertEqual(updated_incident["status"], "contained")
        self.assertEqual(updated_incident["assignee"], "analyst-2")

        timeline = self.client.get(f"/alerts/{alert['id']}/timeline").json()
        event_types = [event["event_type"] for event in timeline]
        self.assertIn("ALERT_CREATED", event_types)
        self.assertIn("ALERT_ASSOCIATED", event_types)

        delete_response = self.client.delete(f"/incidents/{incident['id']}")
        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.json()["message"], "Incident deleted successfully")
        self.assertEqual(self.client.get(f"/incidents/{incident['id']}").status_code, 404)

    def test_duplicate_alert_detection_keeps_alert_and_links_existing_incident(self):
        original_alert = self._create_alert()
        incident = self.client.post(
            "/incidents",
            json={
                "title": "Duplicate correlation target",
                "description": "Incident used to verify duplicate alert linking.",
                "severity": "high",
            },
        ).json()
        self.client.post(f"/incidents/{incident['id']}/alerts/{original_alert['id']}")

        duplicate_response = self.client.post(
            "/alerts",
            json={
                "source": original_alert["source"],
                "severity": original_alert["severity"],
                "title": original_alert["title"],
                "description": original_alert["description"],
            },
        )
        self.assertEqual(duplicate_response.status_code, 201)
        duplicate_alert = duplicate_response.json()
        self.assertEqual(duplicate_alert["duplicate_of_alert_id"], original_alert["id"])
        self.assertEqual(duplicate_alert["incident_id"], incident["id"])

        alerts = self.client.get("/alerts", params={"limit": 100}).json()
        self.assertEqual(len(alerts), 2)

        timeline = self.client.get(f"/alerts/{duplicate_alert['id']}/timeline").json()
        event_types = [event["event_type"] for event in timeline]
        self.assertIn("ALERT_CREATED", event_types)
        self.assertIn("DUPLICATE_DETECTED", event_types)

    def test_execute_playbook_persists_execution_timeline_and_incident(self):
        alert = self._create_alert(severity="high")

        execute_response = self.client.post(f"/alerts/{alert['id']}/execute")
        self.assertEqual(execute_response.status_code, 200)
        execution_result = execute_response.json()
        self.assertEqual(execution_result["alert_id"], alert["id"])
        self.assertEqual(execution_result["risk_score"], 95)
        self.assertEqual(execution_result["risk_level"], "Critical")
        self.assertEqual(execution_result["action"], "block_ip")
        self.assertEqual(execution_result["status"], "completed")
        self.assertTrue(execution_result["simulated"])
        self.assertIsNotNone(execution_result["incident_id"])

        executions = self.client.get(
            f"/alerts/{alert['id']}/playbook-executions"
        ).json()
        self.assertEqual(len(executions), 1)
        self.assertEqual(executions[0]["status"], "completed")
        self.assertTrue(executions[0]["details"]["simulated"])

        all_executions = self.client.get("/playbook-executions").json()
        self.assertEqual(len(all_executions), 1)

        timeline = self.client.get(f"/alerts/{alert['id']}/timeline").json()
        event_types = [event["event_type"] for event in timeline]
        self.assertIn("ENRICHMENT_STARTED", event_types)
        self.assertIn("ENRICHMENT_COMPLETED", event_types)
        self.assertIn("RISK_CALCULATED", event_types)
        self.assertIn("PLAYBOOK_SELECTED", event_types)
        self.assertIn("PLAYBOOK_STARTED", event_types)
        self.assertIn("PLAYBOOK_COMPLETED", event_types)
        self.assertIn("INCIDENT_CREATED", event_types)

    def test_playbook_failure_is_persisted(self):
        db = self.session_factory()
        try:
            alert = models.Alert(
                source="unit-test",
                severity="high",
                title="Failing playbook alert",
                description="Forces playbook failure handling.",
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)

            service = PlaybookExecutionService(playbook_engine=FailingPlaybookEngine())
            result = service.execute_alert(db, alert, actor="test")
            db.commit()

            self.assertEqual(result["status"], "failed")
            execution = db.query(models.PlaybookExecution).one()
            self.assertEqual(execution.status, "failed")
            self.assertEqual(execution.error_message, "boom")
            failed_event = (
                db.query(models.AuditEvent)
                .filter(models.AuditEvent.event_type == "PLAYBOOK_FAILED")
                .one()
            )
            self.assertEqual(failed_event.alert_id, alert.id)
        finally:
            db.close()

    def _create_alert(self, severity="high"):
        response = self.client.post(
            "/alerts",
            json={
                "source": "Splunk",
                "severity": severity,
                "title": "Brute force attack from 203.0.113.10",
                "description": "Multiple failed login attempts from 203.0.113.10",
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.json()


class FailingPlaybookEngine(PlaybookEngine):
    def execute_playbook(self, alert, risk_score):
        raise RuntimeError("boom")


if __name__ == "__main__":
    unittest.main()
