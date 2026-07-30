import { apiClient } from "./client";
import type { Playbook } from "@/types";

export async function fetchPlaybooks(): Promise<Playbook[]> {
  const { data } = await apiClient.get<Playbook[]>("/playbooks");
  return data;
}
