/*
=======================================================================
  SOAR INCIDENT CONTAINMENT ENGINE — JAVASCRIPT
  Connects dashboard UI to the FastAPI SOAR backend.

  Backend: cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
=======================================================================
  Week 1: Alert ingestion form, scenario buttons, normalization display
  Week 2: Threat enrichment panel rendering
  Week 3: Playbook timeline rendering
  Week 4: Case list, case detail modal, status update, stats refresh
=======================================================================
*/

const API = "http://127.0.0.1:8000";

// Timeline icons per action type
const ACTION_ICONS = {
  ALERT_INGESTED:           { icon: "📥", cls: "dot-info" },
  THREAT_INTEL_LOOKUP:      { icon: "🔍", cls: "dot-info" },
  MONITORING_ENABLED:       { icon: "👁", cls: "dot-low" },
  FIREWALL_BLOCK:           { icon: "🔥", cls: "dot-medium" },
  ANALYST_NOTIFIED:         { icon: "📧", cls: "dot-low" },
  SENIOR_ANALYST_NOTIFIED:  { icon: "🔔", cls: "dot-medium" },
  EDR_ISOLATE_HOST:         { icon: "🔒", cls: "dot-high" },
  MEMORY_DUMP_TRIGGERED:    { icon: "💾", cls: "dot-critical" },
  INCIDENT_ESCALATED:       { icon: "🚨", cls: "dot-critical" },
};

// Current filter state for case list
let caseFilter = "all";
// Currently selected case for modal status update
let selectedCaseId = null;
// Bootstrap modal instance
let caseModal = null;

// ─────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────

function getToken() {
  return document.getElementById("roleSelector").value;
}

async function apiFetch(path, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-token": getToken(),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

function showError(msg) {
  document.getElementById("errorToastMsg").textContent = msg;
  const toast = new bootstrap.Toast(document.getElementById("errorToast"), { delay: 6000 });
  toast.show();
}

function severityClass(sev) {
  return { critical: "sev-critical", high: "sev-high", medium: "sev-medium", low: "sev-low" }[sev] || "sev-medium";
}

function riskClass(score) {
  if (score >= 90) return "risk-critical";
  if (score >= 70) return "risk-high";
  if (score >= 40) return "risk-medium";
  return "risk-low";
}

function statusClass(st) {
  return `status-${st}`;
}

function repBarClass(score) {
  if (score >= 90) return "rep-crit";
  if (score >= 70) return "rep-high";
  if (score >= 40) return "rep-medium";
  return "rep-low";
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch { return iso; }
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch { return iso; }
}

function escapeHTML(s) {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────────────────────────────
// WEEK 4: Server health check + stats refresh
// ─────────────────────────────────────────────────────────────────────

async function checkHealth() {
  try {
    const data = await apiFetch("/health");
    document.getElementById("serverStatus").textContent = "● Online";
    document.getElementById("serverStatus").className = "badge bg-success";
  } catch {
    document.getElementById("serverStatus").textContent = "● Offline";
    document.getElementById("serverStatus").className = "badge bg-danger";
  }
}

async function refreshStats() {
  try {
    const data = await apiFetch("/dashboard/stats");
    document.getElementById("statTotal").textContent = data.total_cases;
    document.getElementById("statCritical").textContent = data.by_severity?.critical || 0;
    document.getElementById("statHigh").textContent = data.by_severity?.high || 0;
    document.getElementById("statContained").textContent = data.cases_contained || 0;
    document.getElementById("statActions").textContent = data.total_actions || 0;
    document.getElementById("statMTTR").textContent =
      data.avg_mttr_seconds ? data.avg_mttr_seconds + "s" : "—";
  } catch { /* stats bar stays at 0 */ }
}

// ─────────────────────────────────────────────────────────────────────
// WEEK 2: Render threat enrichment panel
// ─────────────────────────────────────────────────────────────────────

function renderEnrichment(enrichments) {
  const panel = document.getElementById("enrichPanel");
  const body = document.getElementById("enrichBody");

  if (!enrichments || enrichments.length === 0) {
    panel.style.display = "none";
    return;
  }

  let html = "";
  enrichments.forEach(e => {
    const barClass = repBarClass(e.reputation_score);
    const knownBadBadge = e.is_known_bad
      ? '<span class="badge bg-danger ms-2" style="font-size:10px;">KNOWN BAD</span>'
      : '<span class="badge bg-secondary ms-2" style="font-size:10px;">UNKNOWN</span>';

    const tags = (e.threat_tags || []).map(t =>
      `<span class="threat-tag">${escapeHTML(t)}</span>`
    ).join("");

    html += `
      <div class="enrich-card">
        <div class="d-flex align-items-center justify-content-between">
          <span class="enrich-ip">${escapeHTML(e.ip)}</span>
          ${knownBadBadge}
        </div>
        <div class="rep-bar-wrap">
          <div class="rep-bar ${barClass}" style="width:${e.reputation_score}%"></div>
        </div>
        <div class="d-flex justify-content-between" style="font-size:11px;color:#8b949e;">
          <span>Abuse Score: <strong style="color:#c9d1d9;">${e.reputation_score}/100</strong></span>
          <span>${e.reports || 0} reports</span>
        </div>
        <div style="font-size:11px;color:#8b949e;margin-top:4px;">
          🌍 ${escapeHTML(e.country_name)} &nbsp;·&nbsp; 🏢 ${escapeHTML(e.isp)}
        </div>
        ${tags ? `<div class="mt-2">${tags}</div>` : ""}
        <div style="font-size:10px;color:#484f58;margin-top:4px;">Source: ${escapeHTML(e.source)}</div>
      </div>`;
  });

  body.innerHTML = html;
  panel.style.display = "block";
}

// ─────────────────────────────────────────────────────────────────────
// WEEK 3: Render playbook action timeline
// ─────────────────────────────────────────────────────────────────────

function renderTimeline(actions, caseData, mttr) {
  document.getElementById("timelinePlaceholder").style.display = "none";
  const tl = document.getElementById("timeline");
  tl.style.display = "block";

  // Active case bar
  const bar = document.getElementById("activeCaseBar");
  bar.style.display = "block";
  document.getElementById("activeCaseId").textContent = `Case #${caseData.case_id}`;
  document.getElementById("activeCaseRisk").className =
    "risk-badge " + riskClass(caseData.risk_score);
  document.getElementById("activeCaseRisk").textContent =
    `Risk: ${caseData.risk_score}/100`;
  document.getElementById("activeCaseType").className = "type-badge";
  document.getElementById("activeCaseType").textContent =
    (caseData.alert_type || "unknown").replace(/_/g, " ").toUpperCase();
  document.getElementById("activeCaseSev").className =
    "sev-badge " + severityClass(caseData.severity);
  document.getElementById("activeCaseSev").textContent = caseData.severity?.toUpperCase();
  document.getElementById("activeCaseStatus").className =
    "status-badge " + statusClass(caseData.status);
  document.getElementById("activeCaseStatus").textContent = caseData.status?.toUpperCase();

  // Timeline items
  let html = "";
  actions.forEach(action => {
    const meta = ACTION_ICONS[action.action_type] || { icon: "⚙", cls: "dot-info" };
    html += `
      <div class="timeline-item">
        <div class="timeline-dot ${meta.cls}">${meta.icon}</div>
        <div class="timeline-content">
          <div class="timeline-action-type" style="color:#e6edf3;">
            ${escapeHTML(action.action_type.replace(/_/g, " "))}
          </div>
          <div class="timeline-result">${escapeHTML(action.result)}</div>
          <div class="timeline-target">Target: ${escapeHTML(action.target)}</div>
          <div class="timeline-time">${formatTime(action.timestamp)} · ${escapeHTML(action.executed_by)}</div>
        </div>
      </div>`;
  });
  tl.innerHTML = html;

  // MTTR
  document.getElementById("mttrBox").style.display = "flex";
  document.getElementById("mttrValue").textContent =
    `${mttr}s (${actions.length} actions)`;
}

// ─────────────────────────────────────────────────────────────────────
// WEEK 4: Render case list
// ─────────────────────────────────────────────────────────────────────

let allCases = [];

function renderCaseList() {
  const filtered = caseFilter === "all"
    ? allCases
    : allCases.filter(c => c.status === caseFilter);

  const placeholder = document.getElementById("casesPlaceholder");
  const list = document.getElementById("casesList");

  if (filtered.length === 0) {
    list.style.display = "none";
    placeholder.style.display = "block";
    placeholder.textContent = caseFilter === "all"
      ? "No cases yet. Ingest an alert to create a case."
      : `No cases with status: ${caseFilter}`;
    return;
  }

  placeholder.style.display = "none";
  list.style.display = "block";

  list.innerHTML = filtered.map(c => `
    <div class="case-item" onclick="openCaseDetail('${c.case_id}')">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <span class="case-id">#${c.case_id}</span>
          <span class="sev-badge ${severityClass(c.severity)} ms-2">
            ${(c.severity || "").toUpperCase()}
          </span>
        </div>
        <span class="status-badge ${statusClass(c.status)}">${(c.status || "").toUpperCase()}</span>
      </div>
      <div class="case-host mt-1">
        <span class="type-badge">${(c.alert_type || "").replace(/_/g, " ").toUpperCase()}</span>
        &nbsp;${escapeHTML(c.host)}
      </div>
      <div class="d-flex justify-content-between mt-1">
        <span style="color:#8b949e;font-size:10px;">
          IPs: ${(c.source_ips || []).join(", ") || "—"}
        </span>
        <span class="${riskClass(c.risk_score)}" style="font-size:11px;font-weight:700;">
          ${c.risk_score}/100
        </span>
      </div>
      <div style="font-size:10px;color:#484f58;margin-top:2px;">
        ${formatDateTime(c.created_at)} · ${c.action_count} actions
      </div>
    </div>
  `).join("");
}

async function refreshCases() {
  try {
    const data = await apiFetch("/cases");
    allCases = data.cases || [];
    renderCaseList();
  } catch (e) { /* no cases yet, not an error */ }
}

// ─────────────────────────────────────────────────────────────────────
// WEEK 4: Case detail modal
// ─────────────────────────────────────────────────────────────────────

async function openCaseDetail(caseId) {
  selectedCaseId = caseId;
  const body = document.getElementById("caseModalBody");
  body.innerHTML = "<p class='text-muted text-center py-3'>Loading...</p>";

  if (!caseModal) {
    caseModal = new bootstrap.Modal(document.getElementById("caseModal"));
  }
  caseModal.show();

  try {
    const c = await apiFetch(`/cases/${caseId}`);

    // Set current status in the update selector
    document.getElementById("statusUpdateSelect").value = c.status;

    // Build enrichment summary
    const enrichSummary = (c.enrichments || []).map(e =>
      `<div class="detail-row">
         <span class="detail-key">${e.ip}</span>
         <span class="detail-val">Score: ${e.reputation_score}/100 · ${e.country_name}</span>
       </div>`
    ).join("");

    // Build action timeline for modal
    const actions = (c.actions || []).map(a => {
      const meta = ACTION_ICONS[a.action_type] || { icon: "⚙" };
      return `<div class="timeline-item">
        <div class="timeline-dot ${(ACTION_ICONS[a.action_type] || { cls: "dot-info" }).cls}">
          ${meta.icon}
        </div>
        <div class="timeline-content">
          <div class="timeline-action-type" style="color:#e6edf3;">
            ${escapeHTML(a.action_type.replace(/_/g, " "))}
          </div>
          <div class="timeline-result">${escapeHTML(a.result)}</div>
          <div class="timeline-target">Target: ${escapeHTML(a.target)}</div>
          <div class="timeline-time">${formatTime(a.timestamp)}</div>
        </div>
      </div>`;
    }).join("");

    body.innerHTML = `
      <h6 class="text-muted mb-3" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Case Overview</h6>
      <div class="detail-row"><span class="detail-key">Case ID</span><span class="detail-val">${escapeHTML(c.case_id)}</span></div>
      <div class="detail-row"><span class="detail-key">Alert Type</span><span class="detail-val">${escapeHTML(c.alert_type)}</span></div>
      <div class="detail-row"><span class="detail-key">Severity</span>
        <span class="sev-badge ${severityClass(c.severity)}">${(c.severity || "").toUpperCase()}</span>
      </div>
      <div class="detail-row"><span class="detail-key">Risk Score</span>
        <span class="${riskClass(c.risk_score)}" style="font-weight:700;">${c.risk_score}/100</span>
      </div>
      <div class="detail-row"><span class="detail-key">Status</span>
        <span class="status-badge ${statusClass(c.status)}">${(c.status || "").toUpperCase()}</span>
      </div>
      <div class="detail-row"><span class="detail-key">Host</span><span class="detail-val">${escapeHTML(c.host)}</span></div>
      <div class="detail-row"><span class="detail-key">Source IPs</span><span class="detail-val">${(c.source_ips || []).join(", ") || "—"}</span></div>
      <div class="detail-row"><span class="detail-key">SIEM Source</span><span class="detail-val">${escapeHTML(c.siem_source)}</span></div>
      <div class="detail-row"><span class="detail-key">Created At</span><span class="detail-val">${formatDateTime(c.created_at)}</span></div>
      <div class="detail-row"><span class="detail-key">Assigned To</span><span class="detail-val">${escapeHTML(c.assigned_to)}</span></div>

      <h6 class="text-muted mt-4 mb-2" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Description</h6>
      <p style="font-size:12px;color:#8b949e;background:#0d1117;border-radius:6px;padding:10px;">
        ${escapeHTML(c.description)}
      </p>

      ${enrichSummary ? `
        <h6 class="text-muted mt-3 mb-2" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;">Threat Intelligence</h6>
        ${enrichSummary}
      ` : ""}

      <h6 class="text-muted mt-4 mb-3" style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;">
        Playbook Execution Timeline (${c.actions?.length || 0} actions)
      </h6>
      ${actions || '<p class="text-muted" style="font-size:12px;">No actions recorded.</p>'}
    `;
  } catch (e) {
    body.innerHTML = `<p class="text-danger">Failed to load case: ${escapeHTML(e.message)}</p>`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// WEEK 3+4: Alert ingestion — main action
// ─────────────────────────────────────────────────────────────────────

async function ingestAlert(payload, endpoint) {
  document.getElementById("ingestLoading").style.display = "block";
  document.getElementById("ingestBtn").disabled = true;

  try {
    const data = await apiFetch(endpoint, "POST", payload);

    // Week 2: show enrichment
    renderEnrichment(data.enrichments);

    // Week 3: show timeline
    renderTimeline(
      data.playbook_actions,
      {
        case_id: data.case_id,
        risk_score: data.risk_score,
        alert_type: data.alert_type,
        severity: data.severity,
        status: data.status,
      },
      data.mttr_seconds
    );

    // Week 4: refresh case list + stats
    await refreshCases();
    await refreshStats();

  } catch (e) {
    if (e.message.includes("fetch") || e.message.includes("NetworkError")) {
      showError(
        "Cannot connect to backend. Run: cd backend  →  " +
        "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
      );
    } else {
      showError("Error: " + e.message);
    }
  }

  document.getElementById("ingestLoading").style.display = "none";
  document.getElementById("ingestBtn").disabled = false;
}

// ─────────────────────────────────────────────────────────────────────
// DOM READY — wire up all events
// ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {

  // Init bootstrap modal
  caseModal = new bootstrap.Modal(document.getElementById("caseModal"));

  // Check server + load initial data
  checkHealth();
  refreshStats();
  refreshCases();

  // Refresh every 15 seconds
  setInterval(() => { checkHealth(); refreshStats(); refreshCases(); }, 15000);

  // Role selector change — refresh data with new permissions
  document.getElementById("roleSelector").addEventListener("change", function () {
    refreshStats();
    refreshCases();
  });

  // Scenario buttons (Week 1)
  document.querySelectorAll(".btn-scenario").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".btn-scenario").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      ingestAlert({ scenario: this.dataset.scenario }, "/alert/simulate");
    });
  });

  // Custom ingest button (Week 1)
  document.getElementById("ingestBtn").addEventListener("click", function () {
    const desc = document.getElementById("alertDesc").value.trim();
    const ip = document.getElementById("alertIP").value.trim();
    const severity = document.getElementById("alertSeverity").value;
    const host = document.getElementById("alertHost").value.trim() || "unknown-host";
    const source = document.getElementById("alertSource").value.trim() || "SIEM";

    if (!desc && !ip) {
      showError("Please enter a description or source IP, or use a scenario button.");
      return;
    }

    const payload = { description: desc, severity, host, source };
    if (ip) payload.source_ip = ip;

    document.querySelectorAll(".btn-scenario").forEach(b => b.classList.remove("active"));
    ingestAlert(payload, "/alert/ingest");
  });

  // Filter buttons (Week 4)
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      caseFilter = this.dataset.filter;
      renderCaseList();
    });
  });

  // Refresh cases button
  document.getElementById("refreshCasesBtn").addEventListener("click", async function () {
    await refreshCases();
    await refreshStats();
  });

  // Update case status (Week 4 — RBAC: senior_analyst/admin only)
  document.getElementById("updateStatusBtn").addEventListener("click", async function () {
    if (!selectedCaseId) return;
    const newStatus = document.getElementById("statusUpdateSelect").value;
    try {
      await apiFetch(`/cases/${selectedCaseId}/status`, "PUT", { status: newStatus });
      caseModal.hide();
      await refreshCases();
      await refreshStats();
    } catch (e) {
      showError("Status update failed: " + e.message);
    }
  });

});
