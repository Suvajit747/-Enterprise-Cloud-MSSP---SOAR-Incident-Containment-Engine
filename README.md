# -Enterprise-Cloud-MSSP---SOAR-Incident-Containment-Engine
SOAR Incident Containment Engine

Infotact Solutions — Cybersecurity Internship 2026

Project 3: Enterprise Cloud / MSSP - SOAR Incident Containment Engine


What This Project Does

Security Operations Center (SOC) analysts are overwhelmed by thousands of
alerts every day from SIEM systems like Splunk, AWS GuardDuty, and CrowdStrike.
Manually triaging each alert — looking up IP addresses, blocking them in
firewalls, isolating compromised hosts — takes far too long and lets
attackers move freely across the network.

This SOAR (Security Orchestration, Automation and Response) engine
automatically:


Ingests raw security alerts from any SIEM via webhook
Normalizes them into a standard schema regardless of source format
Enriches source IPs with threat intelligence (reputation scores, geolocation)
Calculates a risk score combining alert severity + IP reputation
Executes a defensive playbook automatically based on risk level:

Risk < 40 → Enhanced monitoring
Risk 40–69 → Firewall block the source IP
Risk 70–89 → Firewall block + Isolate the compromised host
Risk ≥ 90 → Full containment + Memory dump + CISO escalation



Tracks every action in a timestamped case management dashboard
Enforces Role-Based Access Control so only senior analysts can close cases


Target MTTR (Mean Time to Respond): under 5 seconds — from alert ingestion
to full containment playbook execution.
