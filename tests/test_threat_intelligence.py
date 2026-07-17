import unittest

from app.threat_intelligence import ThreatIntelligenceService


class ThreatIntelligenceServiceTests(unittest.TestCase):
    def test_calculate_risk_level_uses_score_thresholds(self):
        service = ThreatIntelligenceService()

        self.assertEqual(service.calculate_risk_level(95), "High")
        self.assertEqual(service.calculate_risk_level(75), "High")
        self.assertEqual(service.calculate_risk_level(50), "Medium")
        self.assertEqual(service.calculate_risk_level(49), "Low")


if __name__ == "__main__":
    unittest.main()
