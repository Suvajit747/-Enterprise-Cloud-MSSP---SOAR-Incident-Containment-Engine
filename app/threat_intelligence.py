class ThreatIntelligenceService:
    def enrich_with_virustotal(self, alert):
        return {
            "malicious": True,
            "score": 92,
        }

    def enrich_with_abuseipdb(self, alert):
        return {
            "score": 84,
            "country": "US",
        }

    def calculate_risk_score(self, alert, virus_total, abuse_ipdb):
        severity_scores = {
            "critical": 100,
            "high": 75,
            "medium": 50,
            "low": 25,
        }
        risk_score = severity_scores.get(alert.severity, 0)
        if virus_total.get("malicious") is True:
            risk_score += 10
        if abuse_ipdb.get("score", 0) > 80:
            risk_score += 10
        return risk_score
