export type Priority = "normal" | "vigilar" | "urgente";

export interface StudioClient {
  identification: string;
  displayName: string | null;
  notes: string;
  priority: Priority;
  createdAt: string;
  lastCheckedAt: string | null;
  lastPeriod: string | null;
  worstSituation: number | null;
  entityCount: number;
}

export interface RefreshJobResult {
  identification: string;
  snapshotDate: string;
  status: string;
  hasChanges: boolean;
  retried: boolean;
  attempts: number;
  actualStatus: number;
  historicaStatus: number;
  chequesStatus: number;
}

export interface RefreshJobSummary {
  total: number;
  successful: number;
  failed: number;
  changed: number;
  retried: number;
  statusCounts: Record<string, number>;
}

export interface RefreshJob {
  id: string;
  kind: string;
  startedAt: string;
  finishedAt: string | null;
  clientCount: number;
  passCount: number;
  retryQueueCount: number;
  summary: RefreshJobSummary | null;
  results: RefreshJobResult[];
}

export interface StudySummary {
  clientCount: number;
  snapshotCount: number;
  urgent: number;
  watch: number;
  maintenanceCount: number;
  partialCount: number;
  changedCount: number;
  latestJob: RefreshJob | null;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) {
    const message = typeof payload?.error === "string" ? payload.error : "No se pudo completar la operación.";
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchStudyClients() {
  const response = await fetch("/api/studio/clients");
  return parseJsonResponse<StudioClient[]>(response);
}

export async function fetchStudySummary() {
  const response = await fetch("/api/studio/summary");
  return parseJsonResponse<StudySummary>(response);
}

export async function createStudyClient(input: {
  identification: string;
  displayName: string | null;
  notes?: string;
  priority?: Priority;
}) {
  const response = await fetch("/api/studio/clients", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<StudioClient>(response);
}

export async function updateStudyClient(
  identification: string,
  updates: Partial<Pick<StudioClient, "displayName" | "notes" | "priority">>,
) {
  const response = await fetch(`/api/studio/clients/${identification}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  return parseJsonResponse<StudioClient>(response);
}

export async function deleteStudyClient(identification: string) {
  const response = await fetch(`/api/studio/clients/${identification}`, {
    method: "DELETE",
  });

  return parseJsonResponse<{ ok: true }>(response);
}

export async function queryStudyClient(identification: string) {
  const response = await fetch(`/api/studio/clients/${identification}/query`, {
    method: "POST",
  });

  return parseJsonResponse<{
    client: StudioClient;
    snapshot: unknown;
    summary: unknown;
  }>(response);
}

export async function runDailyRefreshJob() {
  const response = await fetch("/api/studio/jobs/daily-refresh", {
    method: "POST",
  });

  return parseJsonResponse<{
    refreshedAt: string;
    job: RefreshJob;
    clientCount: number;
    results: RefreshJobResult[];
  }>(response);
}
