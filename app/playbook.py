class PlaybookEngine:
    supported_actions = [
        "notify_admin",
        "isolate_endpoint",
        "block_ip",
        "create_incident",
        "no_action",
    ]

    def analyze_alert(self, alert):
        title = (alert.title or "").lower()
        description = (alert.description or "").lower()
        return {
            "severity": alert.severity,
            "status": alert.status,
            "source": alert.source,
            "contains_brute_force": "brute" in title or "brute" in description,
            "contains_malware": "malware" in title or "malware" in description,
            "contains_powershell": "powershell" in title or "powershell" in description,
        }

    def determine_action(self, alert):
        analysis = self.analyze_alert(alert)
        if analysis["severity"] == "critical" or analysis["contains_malware"]:
            return "isolate_endpoint"
        if analysis["contains_brute_force"] or analysis["severity"] == "high":
            return "block_ip"
        if analysis["severity"] == "medium":
            return "create_incident"
        if analysis["severity"] == "low":
            return "notify_admin"
        return "no_action"

    def execute_playbook(self, alert):
        action = self.determine_action(alert)
        status = "skipped" if action == "no_action" else "completed"
        return {
            "alert_id": alert.id,
            "action": action,
            "status": status,
            "message": f"Mock playbook action '{action}' executed",
        }
