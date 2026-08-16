class PlaybookEngine:
    supported_actions = [
        "notify_admin",
        "isolate_endpoint",
        "block_ip",
        "create_incident",
        "no_action",
    ]
    risk_rules = [
        {
            "minimum_score": 90,
            "action": "block_ip",
            "description": "Risk >= 90: block the suspected IP because the alert is high confidence and high impact.",
        },
        {
            "minimum_score": 75,
            "action": "isolate_endpoint",
            "description": "Risk >= 75: isolate the endpoint to contain likely compromise.",
        },
        {
            "minimum_score": 50,
            "action": "notify_admin",
            "description": "Risk >= 50: notify an administrator for manual review.",
        },
        {
            "minimum_score": 0,
            "action": "create_incident",
            "description": "Risk < 50: create an incident for tracking without active containment.",
        },
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

    def determine_action(self, alert, risk_score):
        for rule in self.risk_rules:
            if risk_score >= rule["minimum_score"]:
                return rule["action"]
        return "create_incident"

    def execute_playbook(self, alert, risk_score):
        action = self.determine_action(alert, risk_score)
        if action not in self.supported_actions:
            raise ValueError(f"Unsupported playbook action: {action}")
        status = "skipped" if action == "no_action" else "completed"
        return {
            "alert_id": alert.id,
            "risk_score": risk_score,
            "action": action,
            "status": status,
            "message": (
                f"SIMULATED playbook action '{action}' executed. "
                "No real firewall, EDR, cloud, identity, or network containment integration was invoked."
            ),
            "simulated": True,
        }
