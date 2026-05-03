import type {
  ApiEnvelope,
  ChequesRechazadosResponse,
  DeudaActualResponse,
  DeudaHistoricaResponse,
  QueryKind,
} from "../types/bcra";

function getDefaultApiBase() {
  if (import.meta.env.DEV) {
    return "/api/bcra";
  }

  if (window.location.hostname.endsWith("github.io")) {
    return "https://api.bcra.gob.ar";
  }

  return "/api/bcra";
}

const API_BASE = import.meta.env.VITE_BCRA_API_BASE ?? getDefaultApiBase();

const endpointByKind: Record<QueryKind, string> = {
  actual: "/CentralDeDeudores/v1.0/Deudas",
  historica: "/CentralDeDeudores/v1.0/Deudas/Historicas",
  cheques: "/CentralDeDeudores/v1.0/Deudas/ChequesRechazados",
};

const fallbackErrors: Record<number, string> = {
  400: "La identificación enviada no es válida.",
  404: "No se encontraron registros para esa identificación.",
  500: "El servicio del BCRA no respondió correctamente.",
};

export class BcraApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BcraApiError";
  }
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getNetworkErrorMessage() {
  const isGithubPages = window.location.hostname.endsWith("github.io");
  const isDirectBcra = API_BASE === "https://api.bcra.gob.ar";

  if (isGithubPages && isDirectBcra) {
    return "Este despliegue en GitHub Pages no puede consultar directo al BCRA desde el navegador. Hace falta un proxy o backend intermedio.";
  }

  return "No se pudo conectar con el servicio del BCRA. Probá de nuevo en unos minutos.";
}

async function requestBcra<T>(kind: QueryKind, identification: string): Promise<T> {
  const cleanIdentification = identification.replace(/\D/g, "");
  const url = `${API_BASE}${endpointByKind[kind]}/${cleanIdentification}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response: Response;

    try {
      response = await fetch(url);
    } catch (error) {
      if (attempt < 2 && error instanceof TypeError) {
        await delay(350 * (attempt + 1));
        continue;
      }

      if (error instanceof TypeError) {
        throw new Error(getNetworkErrorMessage());
      }

      throw error;
    }

    if (response.ok) {
      const payload = (await response.json()) as ApiEnvelope<T>;

      if (!payload.results) {
        throw new Error("La respuesta del BCRA llegó sin datos utilizables.");
      }

      return payload.results;
    }

    let message = fallbackErrors[response.status] ?? "No fue posible completar la consulta.";

    try {
      const payload = (await response.json()) as { errorMessages?: string[] };
      if (payload.errorMessages?.[0]) {
        message = payload.errorMessages[0];
      }
    } catch {
      // Si el servicio no devuelve JSON utilizable, se conserva el mensaje por status.
    }

    if (response.status >= 500 && attempt < 2) {
      await delay(350 * (attempt + 1));
      continue;
    }

    throw new BcraApiError(message, response.status);
  }

  throw new Error("No se pudo completar la consulta al BCRA.");
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
