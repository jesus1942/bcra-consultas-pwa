import type {
  ApiEnvelope,
  ChequesRechazadosResponse,
  DeudaActualResponse,
  DeudaHistoricaResponse,
  QueryKind,
} from "../types/bcra";

const API_BASE = import.meta.env.VITE_BCRA_API_BASE ?? "https://api.bcra.gob.ar";

const endpointByKind: Record<QueryKind, string> = {
  actual: "/centraldedeudores/v1.0/Deudas",
  historica: "/centraldedeudores/v1.0/Deudas/Historicas",
  cheques: "/centraldedeudores/v1.0/Deudas/ChequesRechazados",
};

const fallbackErrors: Record<number, string> = {
  400: "La identificación enviada no es válida.",
  404: "No se encontraron registros para esa identificación.",
  500: "El servicio del BCRA no respondió correctamente.",
};

async function requestBcra<T>(kind: QueryKind, identification: string): Promise<T> {
  const cleanIdentification = identification.replace(/\D/g, "");
  const response = await fetch(`${API_BASE}${endpointByKind[kind]}/${cleanIdentification}`);

  if (!response.ok) {
    throw new Error(fallbackErrors[response.status] ?? "No fue posible completar la consulta.");
  }

  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!payload.results) {
    throw new Error("La respuesta del BCRA llegó sin datos utilizables.");
  }

  return payload.results;
}

export function fetchDeudaActual(identification: string) {
  return requestBcra<DeudaActualResponse>("actual", identification);
}

export function fetchDeudaHistorica(identification: string) {
  return requestBcra<DeudaHistoricaResponse>("historica", identification);
}

export function fetchChequesRechazados(identification: string) {
  return requestBcra<ChequesRechazadosResponse>("cheques", identification);
}
