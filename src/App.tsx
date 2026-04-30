import { FormEvent, useEffect, useState } from "react";
import { useBcraQuery } from "./hooks/useBcraQuery";
import { formatCurrency, formatDate, formatPeriod, getSituationLabel, normalizeIdentification } from "./utils/format";

type ActiveTab = "actual" | "historica" | "cheques";

const STORAGE_KEY = "bcra-consultas-recientes";

function App() {
  const [identification, setIdentification] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("actual");
  const [recent, setRecent] = useState<string[]>([]);
  const { loading, error, actual, historica, cheques, run } = useBcraQuery();

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

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero__badge">PWA · Open Finance · BCRA</div>
        <h1>Consultas de deuda para usar desde el celular.</h1>
        <p>
          Base inicial para consultar deuda actual, historial y cheques rechazados
          contra la API oficial del Banco Central.
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
          <strong>Central de Deudores v1.0</strong>
        </article>
        <article>
          <span>Origen</span>
          <strong>api.bcra.gob.ar</strong>
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
            <h2>{actual?.denominacion ?? historica?.denominacion ?? cheques?.denominacion ?? "Resultado de consulta"}</h2>
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

        {error ? <div className="empty-state error">{error}</div> : null}
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
                      <strong>{formatCurrency(entidad.monto)}</strong>
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
                      <strong>{formatCurrency(entidad.monto)}</strong>
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
                          <strong>{formatCurrency(detalle.monto)}</strong>
                          <span>Rechazo</span>
                          <strong>{formatDate(detalle.fechaRechazo)}</strong>
                          <span>Pago</span>
                          <strong>{formatDate(detalle.fechaPago)}</strong>
                          <span>Multa</span>
                          <strong>{detalle.estadoMulta || "Sin dato"}</strong>
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
      </section>
    </main>
  );
}

export default App;
