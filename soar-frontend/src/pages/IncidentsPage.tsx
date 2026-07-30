import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/common/Button";
import { useNavigate } from "react-router-dom";

/**
 * The backend (see API_USAGE.md / app/main.py) exposes no incident
 * management endpoints — only alert CRUD, enrichment, and playbook
 * execution. Rather than inventing incident data, this page is kept
 * architecturally ready (route, layout, nav entry) for when an
 * incidents API is added, and clearly communicates the current gap.
 */
export function IncidentsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Structured incident tracking derived from correlated alerts."
      />

      <EmptyState
        icon={FolderKanban}
        title="Incident management API is not available in the current backend"
        message="The SOAR backend currently exposes alert-level data only (creation, triage, enrichment, and playbook execution). A dedicated incidents endpoint — with incident ID, linked alert, assigned analyst, and status — hasn't been implemented yet. This page is wired up and ready to render real incident data as soon as that API ships."
        action={
          <Button variant="secondary" size="sm" onClick={() => navigate("/alerts")}>
            Go to Alert Queue
          </Button>
        }
      />
    </div>
  );
}
