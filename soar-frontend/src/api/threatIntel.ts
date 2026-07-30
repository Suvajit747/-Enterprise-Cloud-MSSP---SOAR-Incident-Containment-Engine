/**
 * The backend only exposes threat intelligence enrichment scoped to a
 * single alert (GET /alerts/{id}/enrichment) — there is no global feed
 * endpoint. This module re-exports that call under a name that matches
 * the frontend's threat-intel domain so pages/components don't need to
 * reach into the alerts module directly.
 */
export { fetchAlertEnrichment } from "./alerts";
