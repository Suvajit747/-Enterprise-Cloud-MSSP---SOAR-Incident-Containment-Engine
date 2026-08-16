import base64
from datetime import datetime, timezone
import ipaddress
import json
import re
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from .config import ABUSEIPDB_API_KEY, VIRUSTOTAL_API_KEY
from .services.risk_service import calculate_risk_breakdown, calculate_risk_level


class ThreatIntelligenceService:
    VIRUSTOTAL_BASE_URL = "https://www.virustotal.com/api/v3"
    VIRUSTOTAL_TIMEOUT_SECONDS = 5
    VIRUSTOTAL_MOCK_RESPONSE = {
        "malicious": True,
        "score": 92,
    }
    VIRUSTOTAL_CACHE = {}
    ABUSEIPDB_BASE_URL = "https://api.abuseipdb.com/api/v2/check"
    ABUSEIPDB_TIMEOUT_SECONDS = 5
    ABUSEIPDB_MAX_AGE_DAYS = 90
    ABUSEIPDB_MOCK_RESPONSE = {
        "score": 84,
        "country": "US",
    }
    ABUSEIPDB_CACHE = {}

    def enrich_with_virustotal(self, alert):
        cache_key = self._get_alert_cache_key(alert)
        cached_response = self.VIRUSTOTAL_CACHE.get(cache_key)
        if cached_response is not None:
            return cached_response.copy()

        if not VIRUSTOTAL_API_KEY:
            response = self._build_provider_response(
                provider="VirusTotal",
                status="mock",
                payload=self.VIRUSTOTAL_MOCK_RESPONSE,
                error="VIRUSTOTAL_API_KEY is not configured; using mock fallback.",
            )
        else:
            indicator = self._extract_virustotal_indicator(alert)
            if indicator is None:
                response = self._build_provider_response(
                    provider="VirusTotal",
                    status="mock",
                    payload=self.VIRUSTOTAL_MOCK_RESPONSE,
                    error="No supported VirusTotal indicator found; using mock fallback.",
                )
            else:
                report = self._fetch_virustotal_report(indicator)
                if report is None:
                    response = self._build_provider_response(
                        provider="VirusTotal",
                        status="mock",
                        payload=self.VIRUSTOTAL_MOCK_RESPONSE,
                        error="VirusTotal was unavailable or returned an error; using mock fallback.",
                    )
                else:
                    response = self._build_provider_response(
                        provider="VirusTotal",
                        status="live",
                        payload=self._build_virustotal_response(report),
                    )

        self.VIRUSTOTAL_CACHE[cache_key] = response.copy()
        return response.copy()

    def enrich_with_abuseipdb(self, alert):
        cache_key = self._get_alert_cache_key(alert)
        cached_response = self.ABUSEIPDB_CACHE.get(cache_key)
        if cached_response is not None:
            return cached_response.copy()

        if not ABUSEIPDB_API_KEY:
            response = self._build_provider_response(
                provider="AbuseIPDB",
                status="mock",
                payload={
                    **self.ABUSEIPDB_MOCK_RESPONSE,
                    "malicious": self.ABUSEIPDB_MOCK_RESPONSE["score"] > 80,
                },
                error="ABUSEIPDB_API_KEY is not configured; using mock fallback.",
            )
        else:
            ip_address = self._extract_ip_address(alert)
            if ip_address is None:
                response = self._build_provider_response(
                    provider="AbuseIPDB",
                    status="mock",
                    payload={
                        **self.ABUSEIPDB_MOCK_RESPONSE,
                        "malicious": self.ABUSEIPDB_MOCK_RESPONSE["score"] > 80,
                    },
                    error="No IP address found for AbuseIPDB lookup; using mock fallback.",
                )
            else:
                report = self._fetch_abuseipdb_report(ip_address)
                if report is None:
                    response = self._build_provider_response(
                        provider="AbuseIPDB",
                        status="mock",
                        payload={
                            **self.ABUSEIPDB_MOCK_RESPONSE,
                            "malicious": self.ABUSEIPDB_MOCK_RESPONSE["score"] > 80,
                        },
                        error="AbuseIPDB was unavailable or returned an error; using mock fallback.",
                    )
                else:
                    abuseipdb_response = self._build_abuseipdb_response(report)
                    response = self._build_provider_response(
                        provider="AbuseIPDB",
                        status="live",
                        payload={
                            **abuseipdb_response,
                            "malicious": abuseipdb_response["score"] > 80,
                        },
                    )

        self.ABUSEIPDB_CACHE[cache_key] = response.copy()
        return response.copy()

    def calculate_risk_score(self, alert, virus_total, abuse_ipdb):
        return int(
            self.calculate_risk_breakdown(alert, virus_total, abuse_ipdb)["final_score"]
        )

    def calculate_risk_level(self, risk_score):
        return calculate_risk_level(risk_score)

    def calculate_risk_breakdown(self, alert, virus_total, abuse_ipdb):
        return calculate_risk_breakdown(alert, virus_total, abuse_ipdb)

    def _get_alert_cache_key(self, alert):
        alert_id = getattr(alert, "id", None)
        if alert_id is not None:
            return alert_id
        return (
            getattr(alert, "source", ""),
            getattr(alert, "title", ""),
            getattr(alert, "description", ""),
        )

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

        ip_address = self._extract_ip_address(alert)
        if ip_address:
            return "ip_addresses", ip_address

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

    def _extract_ip_address(self, alert):
        text = f"{alert.title or ''} {alert.description or ''} {alert.source or ''}"
        for candidate in re.findall(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", text):
            try:
                ipaddress.ip_address(candidate)
            except ValueError:
                continue
            return candidate
        return None

    def _fetch_abuseipdb_report(self, ip_address):
        query_string = urlencode(
            {
                "ipAddress": ip_address,
                "maxAgeInDays": self.ABUSEIPDB_MAX_AGE_DAYS,
            }
        )
        request = Request(
            f"{self.ABUSEIPDB_BASE_URL}?{query_string}",
            headers={
                "Accept": "application/json",
                "Key": ABUSEIPDB_API_KEY,
            },
        )

        try:
            with urlopen(request, timeout=self.ABUSEIPDB_TIMEOUT_SECONDS) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            if error.code in {401, 403, 429}:
                return None
            return None
        except (URLError, TimeoutError, json.JSONDecodeError):
            return None

    def _build_abuseipdb_response(self, report):
        data = report.get("data", {})
        return {
            "score": int(data.get("abuseConfidenceScore", 0) or 0),
            "country": data.get("countryCode") or "Unknown",
        }

    def _build_provider_response(self, provider, status, payload, error=None):
        return {
            "provider": provider,
            "status": status,
            **payload,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "error": error,
        }
