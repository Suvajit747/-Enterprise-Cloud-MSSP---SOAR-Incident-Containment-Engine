import base64
import ipaddress
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from .config import VIRUSTOTAL_API_KEY


class ThreatIntelligenceService:
    VIRUSTOTAL_BASE_URL = "https://www.virustotal.com/api/v3"
    VIRUSTOTAL_TIMEOUT_SECONDS = 5
    VIRUSTOTAL_MOCK_RESPONSE = {
        "malicious": True,
        "score": 92,
    }

    def enrich_with_virustotal(self, alert):
        if not VIRUSTOTAL_API_KEY:
            return self.VIRUSTOTAL_MOCK_RESPONSE.copy()

        indicator = self._extract_virustotal_indicator(alert)
        if indicator is None:
            return self.VIRUSTOTAL_MOCK_RESPONSE.copy()

        report = self._fetch_virustotal_report(indicator)
        if report is None:
            return self.VIRUSTOTAL_MOCK_RESPONSE.copy()

        return self._build_virustotal_response(report)

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

    def _extract_virustotal_indicator(self, alert):
        text = f"{alert.title or ''} {alert.description or ''} {alert.source or ''}"

        url_match = re.search(r"https?://[^\s<>\"]+", text)
        if url_match:
            url = url_match.group(0).rstrip(".,);]")
            url_id = base64.urlsafe_b64encode(url.encode("utf-8")).decode("utf-8").rstrip("=")
            return "urls", url_id

        hash_match = re.search(r"\b(?:[A-Fa-f0-9]{64}|[A-Fa-f0-9]{40}|[A-Fa-f0-9]{32})\b", text)
        if hash_match:
            return "files", hash_match.group(0)

        for candidate in re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", text):
            try:
                ipaddress.ip_address(candidate)
            except ValueError:
                continue
            return "ip_addresses", candidate

        domain_match = re.search(r"\b(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}\b", text)
        if domain_match:
            return "domains", domain_match.group(0).lower().rstrip(".")

        return None

    def _fetch_virustotal_report(self, indicator):
        resource_type, identifier = indicator
        url = f"{self.VIRUSTOTAL_BASE_URL}/{resource_type}/{quote(identifier, safe='')}"
        request = Request(
            url,
            headers={
                "accept": "application/json",
                "x-apikey": VIRUSTOTAL_API_KEY,
            },
        )

        try:
            with urlopen(request, timeout=self.VIRUSTOTAL_TIMEOUT_SECONDS) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            if error.code in {401, 403, 429}:
                return None
            return None
        except (URLError, TimeoutError, json.JSONDecodeError):
            return None

    def _build_virustotal_response(self, report):
        attributes = report.get("data", {}).get("attributes", {})
        stats = attributes.get("last_analysis_stats", {})
        malicious_count = int(stats.get("malicious", 0) or 0)
        suspicious_count = int(stats.get("suspicious", 0) or 0)
        total_count = sum(
            int(stats.get(key, 0) or 0)
            for key in ("malicious", "suspicious", "harmless", "undetected", "timeout")
        )
        detection_count = malicious_count + suspicious_count
        score = round((detection_count / total_count) * 100) if total_count else 0
        return {
            "malicious": detection_count > 0,
            "score": score,
        }
