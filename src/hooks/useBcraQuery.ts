import { useState } from "react";
import {
  fetchChequesRechazados,
  fetchDeudaActual,
  fetchDeudaHistorica,
} from "../lib/bcra";
import type {
  ChequesRechazadosResponse,
  DeudaActualResponse,
  DeudaHistoricaResponse,
} from "../types/bcra";

export interface QueryState {
  loading: boolean;
  error: string | null;
  actual: DeudaActualResponse | null;
  historica: DeudaHistoricaResponse | null;
  cheques: ChequesRechazadosResponse | null;
}

const initialState: QueryState = {
  loading: false,
  error: null,
  actual: null,
  historica: null,
  cheques: null,
};

export function useBcraQuery() {
  const [state, setState] = useState<QueryState>(initialState);

  async function run(identification: string) {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const [actual, historica, cheques] = await Promise.all([
        fetchDeudaActual(identification),
        fetchDeudaHistorica(identification),
        fetchChequesRechazados(identification),
      ]);

      setState({
        loading: false,
        error: null,
        actual,
        historica,
        cheques,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Falló la consulta.",
        actual: null,
        historica: null,
        cheques: null,
      });
    }
  }

  return {
    ...state,
    run,
  };
}
