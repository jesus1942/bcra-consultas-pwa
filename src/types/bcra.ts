export interface ApiEnvelope<T> {
  status: number;
  results: T;
}

export interface DeudaEntidadActual {
  entidad: string;
  situacion: number;
  fechaSit1: string | null;
  monto: number;
  diasAtrasoPago: number;
  refinanciaciones: boolean;
  recategorizacionOblig: boolean;
  situacionJuridica: boolean;
  irrecDisposicionTecnica: boolean;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface DeudaPeriodoActual {
  periodo: string;
  entidades: DeudaEntidadActual[];
}

export interface DeudaActualResponse {
  identificacion: number;
  denominacion: string;
  periodos: DeudaPeriodoActual[];
}

export interface DeudaEntidadHistorica {
  entidad: string;
  situacion: number;
  monto: number;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface DeudaPeriodoHistorica {
  periodo: string;
  entidades: DeudaEntidadHistorica[];
}

export interface DeudaHistoricaResponse {
  identificacion: number;
  denominacion: string;
  periodos: DeudaPeriodoHistorica[];
}

export interface ChequeDetalle {
  nroCheque: number;
  fechaRechazo: string | null;
  monto: number;
  fechaPago: string | null;
  fechaPagoMulta: string | null;
  estadoMulta: string;
  ctaPersonal: boolean;
  denomJuridica: string;
  enRevision: boolean;
  procesoJud: boolean;
}

export interface ChequeEntidad {
  entidad: number;
  detalle: ChequeDetalle[];
}

export interface ChequeCausal {
  causal: string;
  entidades: ChequeEntidad[];
}

export interface ChequesRechazadosResponse {
  identificacion: number;
  denominacion: string;
  causales: ChequeCausal[];
}

export type QueryKind = "actual" | "historica" | "cheques";
