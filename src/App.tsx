import { FormEvent, useEffect, useState } from "react";
import { API_ORIGIN, API_SERVICE, APP_BASE_URL, APP_VERSION } from "./appMeta";
import { useBcraQuery } from "./hooks/useBcraQuery";
import {
  createStudyClient,
  deleteStudyClient,
  fetchStudyClients,
  fetchStudySummary,
  Priority,
  queryStudyClient,
  runDailyRefreshJob,
  StudioClient,
  StudySummary,
  updateStudyClient,
} from "./lib/studio";
import {
  formatChequeCurrency,
  formatDate,
  formatDebtCurrency,
  formatPeriod,
  getSituationLabel,
  normalizeIdentification,
} from "./utils/format";

type ActiveTab = "actual" | "historica" | "cheques";

const STORAGE_KEY = "bcra-consultas-recientes";

function getWorstSituation(actual: ReturnType<typeof useBcraQuery>["actual"]) {
  if (!actual?.periodos[0]) {
    return null;
  }

  return actual.periodos[0].entidades.reduce((max, entity) => Math.max(max, entity.situacion), 0);
}

function getPriorityLabel(priority: Priority) {
  const labels: Record<Priority, string> = {
    normal: "Normal",
    vigilar: "Vigilar",
    urgente: "Urgente",
  };

  return labels[priority];
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sin dato";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function App() {
  const [identification, setIdentification] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("actual");
  const [recent, setRecent] = useState<string[]>([]);
  const [portfolio, setPortfolio] = useState<StudioClient[]>([]);
  const [studySummary, setStudySummary] = useState<StudySummary | null>(null);
  const [studyLoading, setStudyLoading] = useState(true);
  const [studyError, setStudyError] = useState<string | null>(null);
  const [studyBusyKey, setStudyBusyKey] = useState<string | null>(null);
  const { loading, error, actual, historica, cheques, identification: queriedId, run } = useBcraQuery();
  const displayName = actual?.denominacion ?? historica?.denominacion ?? cheques?.denominacion ?? null;
  const isMaintenance = error?.toLowerCase().includes("mantenimiento") ?? false;
  const clientInPortfolio = queriedId ? portfolio.find((client) => client.identification === queriedId) : null;

  async function loadStudyData() {
    setStudyLoading(true);
    setStudyError(null);

    try {
      const [clients, summary] = await Promise.all([fetchStudyClients(), fetchStudySummary()]);
      setPortfolio(clients);
      setStudySummary(summary);
    } catch (studyLoadError) {
      setStudyError(studyLoadError instanceof Error ? studyLoadError.message : "No se pudo cargar la cartera del estudio.");
    } finally {
      setStudyLoading(false);
    }
  }

  async function refreshStudySummary() {
    try {
      const summary = await fetchStudySummary();
      setStudySummary(summary);
    } catch (summaryError) {
      setStudyError(summaryError instanceof Error ? summaryError.message : "No se pudo actualizar el resumen del estudio.");
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      setRecent(parsed.slice(0, 4));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    loadStudyData();
  }, []);

  function persistRecent(nextId: string) {
    const next = [nextId, ...recent.filter((item) => item !== nextId)].slice(0, 4);
    setRecent(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanId = normalizeIdentification(identification);

    if (cleanId.length !== 11) {
      return;
    }

    setIdentification(cleanId);
    persistRecent(cleanId);
    run(cleanId);
  }

  async function upsertPortfolioClient(priority: Priority = clientInPortfolio?.priority ?? "normal") {
    if (!queriedId || !displayName) {
      return;
    }

    setStudyBusyKey(`save:${queriedId}`);
    setStudyError(null);

    try {
      if (!clientInPortfolio) {
        await createStudyClient({
          identification: queriedId,
          displayName,
          priority,
        });
      } else {
        await updateStudyClient(queriedId, {
          displayName,
          priority,
        });
      }

      await queryStudyClient(queriedId);
      await loadStudyData();
    } catch (portfolioError) {
      setStudyError(portfolioError instanceof Error ? portfolioError.message : "No se pudo guardar el cliente en cartera.");
    } finally {
      setStudyBusyKey(null);
    }
  }

  function updatePortfolioClientLocally(identificationToUpdate: string, updates: Partial<StudioClient>) {
    setPortfolio((current) => {
      return current.map((client) =>
        client.identification === identificationToUpdate ? { ...client, ...updates } : client,
      );
    });
  }

  async function persistPortfolioClient(identificationToUpdate: string, updates: Partial<StudioClient>) {
    setStudyBusyKey(`update:${identificationToUpdate}`);
    setStudyError(null);

    try {
      const updatedClient = await updateStudyClient(identificationToUpdate, {
        displayName: updates.displayName,
        notes: updates.notes,
        priority: updates.priority,
      });
      setPortfolio((current) =>
        current.map((client) => (client.identification === identificationToUpdate ? updatedClient : client)),
      );
      await refreshStudySummary();
    } catch (portfolioError) {
      setStudyError(portfolioError instanceof Error ? portfolioError.message : "No se pudo actualizar el cliente.");
      await loadStudyData();
    } finally {
      setStudyBusyKey(null);
    }
  }

  async function removePortfolioClient(identificationToRemove: string) {
    setStudyBusyKey(`remove:${identificationToRemove}`);
    setStudyError(null);

    try {
      await deleteStudyClient(identificationToRemove);
      await loadStudyData();
    } catch (portfolioError) {
      setStudyError(portfolioError instanceof Error ? portfolioError.message : "No se pudo quitar el cliente.");
    } finally {
      setStudyBusyKey(null);
    }
  }

  async function requeryPortfolioClient(identificationToQuery: string) {
    setIdentification(identificationToQuery);
    persistRecent(identificationToQuery);
    run(identificationToQuery);
    setStudyBusyKey(`query:${identificationToQuery}`);
    setStudyError(null);

    try {
      await queryStudyClient(identificationToQuery);
      await loadStudyData();
    } catch (portfolioError) {
      setStudyError(portfolioError instanceof Error ? portfolioError.message : "No se pudo reconsultar el cliente en cartera.");
    } finally {
      setStudyBusyKey(null);
    }
  }

  async function handleDailyRefresh() {
    setStudyBusyKey("daily-refresh");
    setStudyError(null);

    try {
      await runDailyRefreshJob();
      await loadStudyData();
    } catch (refreshError) {
      setStudyError(refreshError instanceof Error ? refreshError.message : "No se pudo ejecutar la actualización diaria.");
    } finally {
      setStudyBusyKey(null);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__badge">PWA · Open Finance · BCRA</div>
        <h1>Consultas BCRA</h1>
        <p>
          Deuda actual, historial y cheques rechazados desde la Central de Deudores del Banco Central.
        </p>
      </section>

      <section className="search-card">
        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="identification">CUIT, CUIL o CDI</label>
          <div className="search-form__row">
            <input
              id="identification"
              inputMode="numeric"
              autoComplete="off"
              placeholder="20xxxxxxxxx"
              value={identification}
              onChange={(event) => setIdentification(normalizeIdentification(event.target.value))}
              aria-describedby="search-help"
            />
            <button type="submit" disabled={loading || normalizeIdentification(identification).length !== 11}>
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>
          <p id="search-help">
            Ingresá 11 dígitos. La app limpia guiones y guarda hasta 4 consultas recientes en este dispositivo.
          </p>
        </form>

        {recent.length > 0 ? (
          <div className="recent">
            <span>Recientes</span>
            <div className="recent__list">
              {recent.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="recent__chip"
                  onClick={() => {
                    setIdentification(item);
                    run(item);
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="metrics">
        <article>
          <span>Servicio</span>
          <strong>{API_SERVICE}</strong>
        </article>
        <article>
          <span>Origen</span>
          <strong>{API_ORIGIN}</strong>
        </article>
        <article>
          <span>Modo</span>
          <strong>Instalable en móvil</strong>
        </article>
      </section>

      <section className="results">
        <div className="results__header">
          <div>
            <span className="eyebrow">Panel</span>
            <h2>{displayName ?? "Resultado de consulta"}</h2>
          </div>

          <nav className="tabs" aria-label="Secciones de resultados">
            <button
              type="button"
              className={activeTab === "actual" ? "is-active" : ""}
              onClick={() => setActiveTab("actual")}
            >
              Actual
            </button>
            <button
              type="button"
              className={activeTab === "historica" ? "is-active" : ""}
              onClick={() => setActiveTab("historica")}
            >
              Histórica
            </button>
            <button
              type="button"
              className={activeTab === "cheques" ? "is-active" : ""}
              onClick={() => setActiveTab("cheques")}
            >
              Cheques
            </button>
          </nav>
        </div>

        {displayName && queriedId ? (
          <div className="summary-card">
            <span>Titular</span>
            <strong>{displayName}</strong>
            <span>CUIT/CUIL/CDI</span>
            <strong>{queriedId}</strong>
            <div className="summary-card__actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => upsertPortfolioClient()}
                disabled={studyBusyKey === `save:${queriedId}`}
              >
                {clientInPortfolio ? "Actualizar cartera" : "Agregar a cartera"}
              </button>
            </div>
          </div>
        ) : null}

        {error && isMaintenance ? (
          <div className="maintenance-card" role="status" aria-live="polite">
            <div className="maintenance-card__orbit" aria-hidden="true">
              <span className="maintenance-card__coin">$</span>
              <span className="maintenance-card__spark spark-a" />
              <span className="maintenance-card__spark spark-b" />
              <span className="maintenance-card__spark spark-c" />
            </div>
            <div className="maintenance-card__copy">
              <span className="eyebrow">Pausa Técnica</span>
              <h3>La bóveda del BCRA está en recreo.</h3>
              <p>
                El servicio oficial informó mantenimiento. La app quedó lista para consultar de nuevo
                apenas el backend vuelva a abrir la ventanilla.
              </p>
              <div className="maintenance-card__tips">
                <span>Probá otra vez en unos minutos.</span>
                {queriedId ? <span>Consulta pendiente: {queriedId}</span> : null}
              </div>
            </div>
          </div>
        ) : null}
        {error && !isMaintenance ? <div className="empty-state error">{error}</div> : null}
        {!error && !actual && !historica && !cheques && !loading ? (
          <div className="empty-state">
            Probá una identificación para cargar la primera consulta y validar la experiencia en pantalla chica.
          </div>
        ) : null}

        {!error && activeTab === "actual" && actual ? (
          <div className="stack">
            {actual.periodos.map((periodo) => (
              <article key={periodo.periodo} className="panel">
                <header className="panel__header">
                  <h3>{formatPeriod(periodo.periodo)}</h3>
                  <span>{periodo.entidades.length} entidades</span>
                </header>
                {periodo.entidades.map((entidad) => (
                  <div key={`${periodo.periodo}-${entidad.entidad}`} className="entity">
                    <div className="entity__top">
                      <strong>{entidad.entidad}</strong>
                      <span className={`pill situation-${entidad.situacion}`}>{getSituationLabel(entidad.situacion)}</span>
                    </div>
                    <div className="entity__grid">
                      <span>Monto</span>
                      <strong>{formatDebtCurrency(entidad.monto)}</strong>
                      <span>Atraso</span>
                      <strong>{entidad.diasAtrasoPago} días</strong>
                      <span>Fecha situación 1</span>
                      <strong>{formatDate(entidad.fechaSit1)}</strong>
                    </div>
                    <div className="flags">
                      {entidad.refinanciaciones ? <span>Refinanciada</span> : null}
                      {entidad.recategorizacionOblig ? <span>Recategorización</span> : null}
                      {entidad.situacionJuridica ? <span>Situación jurídica</span> : null}
                      {entidad.irrecDisposicionTecnica ? <span>Irrec. técnica</span> : null}
                      {entidad.enRevision ? <span>En revisión</span> : null}
                      {entidad.procesoJud ? <span>Proceso judicial</span> : null}
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : null}

        {!error && activeTab === "historica" && historica ? (
          <div className="stack">
            {historica.periodos.map((periodo) => (
              <article key={periodo.periodo} className="panel">
                <header className="panel__header">
                  <h3>{formatPeriod(periodo.periodo)}</h3>
                  <span>{periodo.entidades.length} entidades</span>
                </header>
                {periodo.entidades.map((entidad) => (
                  <div key={`${periodo.periodo}-${entidad.entidad}`} className="entity">
                    <div className="entity__top">
                      <strong>{entidad.entidad}</strong>
                      <span className={`pill situation-${entidad.situacion}`}>{getSituationLabel(entidad.situacion)}</span>
                    </div>
                    <div className="entity__grid">
                      <span>Monto</span>
                      <strong>{formatDebtCurrency(entidad.monto)}</strong>
                      <span>Revisión</span>
                      <strong>{entidad.enRevision ? "Sí" : "No"}</strong>
                      <span>Judicial</span>
                      <strong>{entidad.procesoJud ? "Sí" : "No"}</strong>
                    </div>
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : null}

        {!error && activeTab === "cheques" && cheques ? (
          <div className="stack">
            {cheques.causales.map((causal) => (
              <article key={causal.causal} className="panel">
                <header className="panel__header">
                  <h3>{causal.causal}</h3>
                  <span>{causal.entidades.length} entidades</span>
                </header>
                <p>Los montos de cheques rechazados vienen en pesos nominales, no en miles.</p>
                {causal.entidades.map((entidad) => (
                  <div key={`${causal.causal}-${entidad.entidad}`} className="entity">
                    <div className="entity__top">
                      <strong>Entidad {entidad.entidad}</strong>
                    </div>
                    {entidad.detalle.map((detalle) => (
                      <div key={`${entidad.entidad}-${detalle.nroCheque}`} className="check-detail">
                        <div className="entity__grid">
                          <span>Cheque</span>
                          <strong>{detalle.nroCheque}</strong>
                          <span>Monto</span>
                          <strong>{formatChequeCurrency(detalle.monto)}</strong>
                          <span>Rechazo</span>
                          <strong>{formatDate(detalle.fechaRechazo)}</strong>
                          <span>Pago</span>
                          <strong>{formatDate(detalle.fechaPago)}</strong>
                          <span>Pago multa</span>
                          <strong>{formatDate(detalle.fechaPagoMulta)}</strong>
                          <span>Estado multa</span>
                          <strong>{detalle.estadoMulta ?? "Pagada o sin estado informado"}</strong>
                        </div>
                        <div className="flags">
                          {detalle.ctaPersonal ? <span>Cuenta personal</span> : null}
                          {detalle.denomJuridica ? <span>{detalle.denomJuridica}</span> : null}
                          {detalle.enRevision ? <span>En revisión</span> : null}
                          {detalle.procesoJud ? <span>Proceso judicial</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </article>
            ))}
          </div>
        ) : null}

        {!error && activeTab === "cheques" && !cheques && (actual || historica) ? (
          <div className="empty-state">
            No existen registros de cheques rechazados para esta consulta.
          </div>
        ) : null}
      </section>

      <section className="legal-strip">
        <div>
          <span className="eyebrow">Info</span>
          <p>
            Versión {APP_VERSION}. Esta app consume datos públicos del BCRA y expone
            el aviso legal en una ventana aparte para consulta rápida.
          </p>
        </div>
        <div className="legal-strip__actions">
          <a className="secondary-action" href={`${APP_BASE_URL}aviso-legal.html`} target="_blank" rel="noreferrer">
            Aviso legal
          </a>
        </div>
      </section>

      <section className="results">
        <div className="results__header">
          <div>
            <span className="eyebrow">Estudio</span>
            <h2>Cartera de clientes</h2>
          </div>
          <div className="summary-card__actions">
            <button
              type="button"
              className="secondary-action"
              onClick={handleDailyRefresh}
              disabled={studyBusyKey === "daily-refresh" || portfolio.length === 0}
            >
              {studyBusyKey === "daily-refresh" ? "Actualizando..." : "Refresh diario"}
            </button>
          </div>
        </div>

        {studySummary ? (
          <div className="study-overview">
            <article className="study-overview__card">
              <span>Clientes</span>
              <strong>{studySummary.clientCount}</strong>
            </article>
            <article className="study-overview__card">
              <span>Snapshots</span>
              <strong>{studySummary.snapshotCount}</strong>
            </article>
            <article className="study-overview__card">
              <span>Urgentes</span>
              <strong>{studySummary.urgent}</strong>
            </article>
            <article className="study-overview__card">
              <span>Último refresh</span>
              <strong>{studySummary.latestJob?.finishedAt ? formatDateTime(studySummary.latestJob.finishedAt) : "Sin correr"}</strong>
            </article>
          </div>
        ) : null}

        {studySummary?.latestJob ? (
          <div className="empty-state">
            Última corrida: {studySummary.latestJob.summary?.successful ?? 0} correctos,{" "}
            {studySummary.latestJob.summary?.failed ?? 0} fallidos,{" "}
            {studySummary.latestJob.summary?.retried ?? 0} reintentados.
          </div>
        ) : null}

        {studyError ? <div className="empty-state error">{studyError}</div> : null}
        {studyLoading ? (
          <div className="empty-state">Cargando cartera y resumen del estudio...</div>
        ) : portfolio.length === 0 ? (
          <div className="empty-state">
            Cuando consultes un CUIT, podés guardarlo en cartera con prioridad, notas internas y última revisión.
          </div>
        ) : (
          <div className="portfolio-grid">
            {portfolio.map((client) => (
              <article key={client.identification} className="portfolio-card">
                <div className="portfolio-card__top">
                  <div>
                    <strong>{client.displayName ?? "Cliente sin nombre"}</strong>
                    <span>{client.identification}</span>
                  </div>
                  <button
                    type="button"
                    className="portfolio-card__remove"
                    onClick={() => removePortfolioClient(client.identification)}
                    disabled={studyBusyKey === `remove:${client.identification}`}
                  >
                    Quitar
                  </button>
                </div>

                <div className="portfolio-card__meta">
                  <span>Prioridad</span>
                  <select
                    value={client.priority}
                    onChange={(event) => {
                      const priority = event.target.value as Priority;
                      updatePortfolioClientLocally(client.identification, { priority });
                      void persistPortfolioClient(client.identification, { priority });
                    }}
                    disabled={studyBusyKey === `update:${client.identification}`}
                  >
                    <option value="normal">Normal</option>
                    <option value="vigilar">Vigilar</option>
                    <option value="urgente">Urgente</option>
                  </select>
                  <span>Última consulta</span>
                  <strong>{formatDateTime(client.lastCheckedAt)}</strong>
                  <span>Último período</span>
                  <strong>{client.lastPeriod ? formatPeriod(client.lastPeriod) : "Sin dato"}</strong>
                  <span>Riesgo detectado</span>
                  <strong>{client.worstSituation ? getSituationLabel(client.worstSituation) : "Sin dato"}</strong>
                </div>

                <div className="flags">
                  <span className={`portfolio-priority portfolio-priority--${client.priority}`}>
                    {getPriorityLabel(client.priority)}
                  </span>
                  <span>{client.entityCount} entidades observadas</span>
                </div>

                <label className="portfolio-card__notes">
                  <span>Notas internas</span>
                  <textarea
                    value={client.notes}
                    placeholder="Ej.: volver a revisar al cierre de la jornada, cliente con refinanciación pendiente."
                    onChange={(event) => updatePortfolioClientLocally(client.identification, {
                      notes: event.target.value,
                    })}
                    onBlur={() => {
                      void persistPortfolioClient(client.identification, { notes: client.notes });
                    }}
                  />
                </label>

                <div className="portfolio-card__actions">
                  <button
                    type="button"
                    className="recent__chip"
                    onClick={() => {
                      void requeryPortfolioClient(client.identification);
                    }}
                    disabled={studyBusyKey === `query:${client.identification}`}
                  >
                    Reconsultar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>Desarrollado por</span>
        <strong>Jesus Olguin</strong>
      </footer>
    </main>
  );
}

export default App;
