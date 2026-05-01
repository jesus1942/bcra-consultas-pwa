import { useState } from "react";
import {
  BcraApiError,
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
  identification: string | null;
}

const initialState: QueryState = {
  loading: false,
  error: null,
  actual: null,
  historica: null,
  cheques: null,
  identification: null,
};

export function useBcraQuery() {
  const [state, setState] = useState<QueryState>(initialState);

  async function run(identification: string) {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
      identification,
    }));

    const actualResult = await Promise.allSettled([fetchDeudaActual(identification)]);
    const historicaResult = await Promise.allSettled([fetchDeudaHistorica(identification)]);
    const chequesResult = await Promise.allSettled([fetchChequesRechazados(identification)]);

    const actual = actualResult[0].status === "fulfilled" ? actualResult[0].value : null;
    const historica = historicaResult[0].status === "fulfilled" ? historicaResult[0].value : null;
    const cheques = chequesResult[0].status === "fulfilled" ? chequesResult[0].value : null;

    const failures = [actualResult[0], historicaResult[0], chequesResult[0]].filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    const hasAnyData = actual || historica || cheques;
    const fatalError = failures.find(({ reason }) => !(reason instanceof BcraApiError && reason.status === 404));
    const firstNotFound = failures.find(({ reason }) => reason instanceof BcraApiError && reason.status === 404);

    setState({
      loading: false,
      error:
        !hasAnyData
          ? fatalError?.reason instanceof Error
            ? fatalError.reason.message
            : firstNotFound?.reason instanceof Error
              ? firstNotFound.reason.message
              : null
          : null,
      actual,
      historica,
      cheques,
      identification,
    });
  }

  return {
    ...state,
    run,
  };
}
