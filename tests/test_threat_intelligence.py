import unittest

from app import threat_intelligence as threat_intelligence_module
from app.threat_intelligence import ThreatIntelligenceService


class AlertStub:
    id = None
    source = "unit-test"
    severity = "critical"
    title = "Critical malware alert from 203.0.113.10"
    description = "Malware hash and suspicious IP detected"


class ThreatIntelligenceServiceTests(unittest.TestCase):
    def test_calculate_risk_level_uses_score_thresholds(self):
        service = ThreatIntelligenceService()

        self.assertEqual(service.calculate_risk_level(95), "Critical")
        self.assertEqual(service.calculate_risk_level(90), "Critical")
        self.assertEqual(service.calculate_risk_level(75), "High")
        self.assertEqual(service.calculate_risk_level(50), "Medium")
        self.assertEqual(service.calculate_risk_level(49), "Low")

    def test_calculate_risk_score_caps_final_score_at_100(self):
        service = ThreatIntelligenceService()
        alert = AlertStub()

        score = service.calculate_risk_score(
            alert,
            {"malicious": True, "score": 92},
            {"score": 84},
        )
        breakdown = service.calculate_risk_breakdown(
            alert,
            {"malicious": True, "score": 92},
            {"score": 84},
        )

        self.assertEqual(score, 100)
        self.assertEqual(breakdown["base_score"], 100)
        self.assertEqual(breakdown["virustotal_modifier"], 10)
        self.assertEqual(breakdown["abuseipdb_modifier"], 10)
        self.assertEqual(breakdown["raw_score"], 120)
        self.assertEqual(breakdown["final_score"], 100)
        self.assertEqual(breakdown["risk_level"], "Critical")

    def test_mock_enrichment_identifies_provider_status_and_error(self):
        original_virustotal_key = threat_intelligence_module.VIRUSTOTAL_API_KEY
        original_abuseipdb_key = threat_intelligence_module.ABUSEIPDB_API_KEY
        threat_intelligence_module.VIRUSTOTAL_API_KEY = None
        threat_intelligence_module.ABUSEIPDB_API_KEY = None
        ThreatIntelligenceService.VIRUSTOTAL_CACHE.clear()
        ThreatIntelligenceService.ABUSEIPDB_CACHE.clear()
        service = ThreatIntelligenceService()
        alert = AlertStub()

        try:
            virus_total = service.enrich_with_virustotal(alert)
            abuse_ipdb = service.enrich_with_abuseipdb(alert)

            self.assertEqual(virus_total["provider"], "VirusTotal")
            self.assertEqual(virus_total["status"], "mock")
            self.assertTrue(virus_total["malicious"])
            self.assertEqual(virus_total["score"], 92)
            self.assertIn("timestamp", virus_total)
            self.assertIsNotNone(virus_total["error"])
            self.assertEqual(abuse_ipdb["provider"], "AbuseIPDB")
            self.assertEqual(abuse_ipdb["status"], "mock")
            self.assertTrue(abuse_ipdb["malicious"])
            self.assertEqual(abuse_ipdb["score"], 84)
            self.assertEqual(abuse_ipdb["country"], "US")
            self.assertIn("timestamp", abuse_ipdb)
        finally:
            threat_intelligence_module.VIRUSTOTAL_API_KEY = original_virustotal_key
            threat_intelligence_module.ABUSEIPDB_API_KEY = original_abuseipdb_key


if __name__ == "__main__":
    unittest.main()
