# Daily Git Commit Guide — SOAR Project
## Member 4 | All 20 Days

---

## One-Time Setup (Day 1 Only)

Open Command Prompt inside your project folder and run:

```bash
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"

git init
git remote add origin https://github.com/YOUR-USERNAME/soar-incident-engine.git
git checkout -b member-4-frontend
```

---

## Every Day Routine

```bash
git add .
git commit -m "paste today's message from the table below"
git push origin member-4-frontend
```

---

## All 20 Commit Messages

| Day | Commit Message |
|-----|----------------|
| 1 | `docs: initial project setup, folder structure, README stub` |
| 2 | `feat: add dark SOC navbar, stats bar layout and base CSS` |
| 3 | `feat: add alert ingestion form with severity and host fields` |
| 4 | `feat: add six scenario quick-fire buttons for SIEM simulation` |
| 5 | `feat: add playbook timeline panel HTML structure` |
| 6 | `feat: add case management panel and filter buttons` |
| 7 | `docs: complete Week 1 README with setup instructions` |
| 8 | `feat: connect ingest button to FastAPI /alert/ingest endpoint` |
| 9 | `feat: render threat enrichment IP reputation cards` |
| 10 | `feat: render playbook action timeline with icons and dot colors` |
| 11 | `fix: add error toast, loading spinner, connection error message` |
| 12 | `feat: add risk badge, severity badge, status badge CSS classes` |
| 13 | `docs: add system architecture diagram HTML file` |
| 14 | `docs: add API documentation and playbook guide` |
| 15 | `feat: connect case list to GET /cases with status filters` |
| 16 | `feat: add case detail modal with full action timeline` |
| 17 | `fix: add mobile responsive media queries` |
| 18 | `feat: add RBAC role selector and status update for senior role` |
| 19 | `docs: add component breakdown and daily commit guide` |
| 20 | `docs: final README with real test results and MTTR data` |
