import { API_ORIGIN, API_SERVICE, APP_VERSION, LEGAL_UPDATED_AT } from "./appMeta";

const root = document.getElementById("legal-root");

if (!root) {
  throw new Error("No se pudo montar la página de aviso legal.");
}

root.innerHTML = `
  <main class="legal-shell">
    <section class="legal-hero">
      <span class="legal-badge">Consultas BCRA</span>
      <h1>Aviso legal</h1>
      <p>
        Este aviso legal reúne el texto de referencia del sitio del BCRA y una ficha
        técnica mínima de esta aplicación para que el usuario pueda revisar alcance,
        fuente y versión en una ventana separada.
      </p>
    </section>

    <section class="legal-card">
      <h2>Ficha técnica</h2>
      <dl class="legal-meta">
        <dt>Aplicación</dt>
        <dd>Consultas BCRA PWA</dd>
        <dt>Versión</dt>
        <dd>${APP_VERSION}</dd>
        <dt>Servicio consumido</dt>
        <dd>${API_SERVICE}</dd>
        <dt>Origen de datos</dt>
        <dd>${API_ORIGIN}</dd>
        <dt>Última actualización del aviso</dt>
        <dd>${LEGAL_UPDATED_AT}</dd>
      </dl>

      <div class="legal-links">
        <a href="https://www.bcra.gob.ar/BCRAyVos/catalogo-de-APIs-banco-central.asp" target="_blank" rel="noreferrer">Catálogo oficial de APIs</a>
      </div>
    </section>

    <section class="legal-card">
      <h2>Acerca del contenido</h2>
      <p>El contenido de este sitio web se publica con fines informativos. No constituye, en ningún caso, una recomendación ni un asesoramiento financiero, legal, técnico ni de otra índole por parte del Banco Central de la República Argentina (BCRA).</p>
      <p>A efectos legales, resultan válidos únicamente los textos notificados o publicados en el Boletín Oficial de la República Argentina y demás canales oficiales que se indiquen en la normativa vigente.</p>
    </section>

    <section class="legal-card">
      <h2>Traducciones y alcance de la información</h2>
      <p>El BCRA ofrece en este sitio contenidos en español y, a fin de orientar a audiencias internacionales, versiones en inglés de las secciones del sitio y de sus materiales asociados, salvo indicación en contrario.</p>
      <p>Las versiones en un idioma distinto del original se generan mediante software de traducción automática provisto por terceros y se encuentran sujetas a revisión por traductores profesionales del BCRA. Estas traducciones se ofrecen con fines informativos y pueden contener errores, omisiones, imprecisiones o interpretaciones incorrectas de carácter involuntario. En caso de duda o discrepancia, se recomienda remitirse a la versión original del contenido.</p>
      <p>En el caso de documentos normativos, resoluciones o convenios con validez legal, la única versión auténtica es la publicada por el BCRA en idioma español. Las traducciones que eventualmente se publiquen se ofrecen para facilitar su comprensión y no modifican el alcance ni el contenido del documento original.</p>
      <p>En algunos casos particulares, determinados contenidos pueden haber sido elaborados originalmente en inglés; en esos supuestos, la versión en inglés será la de referencia para la correcta comprensión de dicho material.</p>
      <p>En caso de discrepancias entre las versiones en español y en inglés, prevalecerá la versión original en el idioma en que el contenido haya sido elaborado y publicado por el BCRA. No obstante, a efectos legales, resultan válidos únicamente los textos en español publicados por el BCRA a través de sus canales oficiales de comunicación y, cuando corresponda, los notificados o publicados en el Boletín Oficial de la República Argentina, de conformidad con la normativa vigente aplicable.</p>
    </section>

    <section class="legal-card">
      <h2>1. Ámbito de aplicación</h2>
      <p>Los presentes términos y condiciones de uso aplican exclusivamente al sitio web institucional del Banco Central de la República Argentina (BCRA) y a los contenidos y servicios que se ofrecen a través de él.</p>
      <p>Otros canales o plataformas del BCRA se regirán por las condiciones de uso y políticas específicas que se establezcan en cada caso.</p>
    </section>

    <section class="legal-card">
      <h2>2. Aceptación de los términos</h2>
      <p>El acceso y uso del sitio web del BCRA implica la aceptación de los presentes términos y condiciones de uso.</p>
      <p>El BCRA podrá modificar estos términos y condiciones en cualquier momento, sin necesidad de notificación previa, por lo que se recomienda su revisión periódica.</p>
    </section>

    <section class="legal-card">
      <h2>3. Propiedad intelectual y reutilización de contenidos</h2>
      <p>Los contenidos disponibles en este sitio pertenecen al BCRA, salvo que se indique expresamente lo contrario.</p>
      <p>Se permite su reutilización con fines informativos, educativos o académicos, siempre que se cite la fuente completa, no se altere el significado ni el contexto del contenido original y se respete la integridad del material, sin realizar ediciones que puedan inducir a interpretaciones erróneas.</p>
      <p>No está permitido utilizar los contenidos con fines comerciales, publicitarios o de campaña sin autorización previa y expresa del BCRA.</p>
      <p>Las ideas, procedimientos, métodos de operación y conceptos matemáticos, así como los emblemas, logotipos, denominaciones institucionales y demás signos distintivos que identifican al BCRA y que se encuentren presentes en este sitio, se encuentran protegidos por la legislación vigente.</p>
    </section>

    <section class="legal-card">
      <h2>4. Exactitud y actualización de la información</h2>
      <p>El BCRA realiza esfuerzos razonables para que la información publicada en este sitio sea precisa, completa y se encuentre actualizada con la mayor oportunidad posible. No obstante, pueden existir discrepancias respecto de la información definitiva y no se garantiza la ausencia total de errores u omisiones.</p>
      <p>El BCRA no asume responsabilidad legal alguna, ni de otra índole, por la interpretación que se haga del contenido de este sitio ni por el uso que las personas usuarias realicen de la información disponible.</p>
    </section>

    <section class="legal-card">
      <h2>5. Enlaces a sitios de terceros</h2>
      <p>El sitio web del BCRA puede contener enlaces hacia páginas web de terceros. Dichos enlaces se facilitan únicamente con fines informativos o de mayor comodidad para las personas usuarias.</p>
      <p>El BCRA no tiene control sobre el contenido, la disponibilidad ni las políticas de privacidad de esos sitios, por lo que no asume responsabilidad alguna por la información, productos, servicios, prácticas o contenidos que pudieran ofrecer ni por eventuales daños que se deriven de su utilización.</p>
    </section>

    <section class="legal-card">
      <h2>6. Disponibilidad del sitio web</h2>
      <p>El BCRA no garantiza el funcionamiento ininterrumpido ni la disponibilidad permanente de su sitio web ni de sus servicios, incluidos los datos públicos provistos por el BCRA a través de interfaces de programación de aplicaciones (API).</p>
      <p>El BCRA podrá modificar, adicionar, limitar, suspender o discontinuar, total o parcialmente, la estructura, el diseño, el funcionamiento, los contenidos y/o los servicios del sitio web, en cualquier momento y sin necesidad de notificación previa.</p>
    </section>

    <section class="legal-card">
      <h2>7. Medidas de seguridad y tratamiento de datos personales</h2>
      <p>El BCRA implementa medidas técnicas y organizativas razonables orientadas a proteger la integridad, confidencialidad y disponibilidad de la información publicada en este sitio web y de los datos personales que pudieran ser tratados en el marco de su funcionamiento.</p>
      <p>Como todo sistema que opera sobre tecnologías de la información y la comunicación, el sitio puede estar expuesto a riesgos o vulnerabilidades ajenos al organismo. En este sentido, el BCRA mantiene procesos permanentes de revisión y mejora de sus mecanismos de seguridad con el objetivo de mitigar dichos riesgos.</p>
      <p>El tratamiento de datos personales se realiza de conformidad con la Ley Nº 25.326 de Protección de Datos Personales, su decreto reglamentario y la normativa complementaria aplicable.</p>
    </section>

    <section class="legal-card">
      <h2>8. Tratamiento de datos personales y política de privacidad</h2>
      <p>Los datos personales que las personas usuarias ingresen en los formularios del sitio se tratarán con estricta confidencialidad y sólo se utilizarán para los fines específicos indicados en cada formulario.</p>
      <p>No se compartirán con terceros, salvo que exista una obligación legal o un requerimiento judicial o de autoridad competente debidamente fundado, o se configuren otros supuestos previstos por la normativa de protección de datos personales.</p>
      <p>La información detallada sobre el tratamiento de datos personales, las finalidades, las bases legales, los plazos de conservación, las medidas de seguridad y los canales para el ejercicio de derechos se encuentra desarrollada en la Política de privacidad del BCRA.</p>
    </section>

    <section class="legal-card">
      <h2>9. Jurisdicción aplicable</h2>
      <p>Los términos y condiciones previstos en el presente Aviso Legal se rigen por las leyes de la República Argentina.</p>
      <p>Ante cualquier controversia que surja sobre su interpretación o aplicación, los Tribunales Federales situados en la Ciudad Autónoma de Buenos Aires serán la jurisdicción competente para su resolución.</p>
      <p class="legal-updated">Última actualización: ${LEGAL_UPDATED_AT}.</p>
    </section>
  </main>
`;

const style = document.createElement("style");
style.textContent = `
  :root {
    color: #f6f0e4;
    background:
      radial-gradient(circle at top left, rgba(216, 179, 106, 0.24), transparent 34%),
      radial-gradient(circle at right 20%, rgba(25, 104, 69, 0.3), transparent 28%),
      linear-gradient(180deg, #071510 0%, #0d211a 52%, #08110e 100%);
    font-family: "DM Sans", "Segoe UI", sans-serif;
    --surface: rgba(8, 23, 18, 0.72);
    --surface-border: rgba(227, 205, 158, 0.14);
    --text-soft: rgba(246, 240, 228, 0.76);
    --accent-strong: #efd7a7;
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
  }

  a {
    color: inherit;
  }

  .legal-shell {
    width: min(100%, 60rem);
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
    display: grid;
    gap: 1rem;
  }

  .legal-hero,
  .legal-card {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: 1.35rem;
    backdrop-filter: blur(18px);
    box-shadow: 0 26px 60px rgba(0, 0, 0, 0.22);
  }

  .legal-hero,
  .legal-card {
    padding: 1.1rem;
  }

  .legal-badge {
    display: inline-flex;
    padding: 0.4rem 0.7rem;
    border-radius: 999px;
    background: rgba(216, 179, 106, 0.16);
    border: 1px solid rgba(216, 179, 106, 0.26);
    color: var(--accent-strong);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-size: 0.75rem;
  }

  h1, h2 {
    margin: 0;
  }

  h1 {
    margin-top: 0.85rem;
    font-size: clamp(2rem, 7vw, 3.2rem);
  }

  h2 {
    margin-bottom: 0.9rem;
    font-size: 1.15rem;
  }

  p {
    margin: 0.8rem 0 0;
    color: var(--text-soft);
    line-height: 1.65;
  }

  .legal-meta {
    margin: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }

  .legal-meta dt {
    color: var(--text-soft);
  }

  .legal-meta dd {
    margin: 0;
    font-weight: 700;
  }

  .legal-links {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .legal-links a {
    text-decoration: none;
    padding: 0.85rem 1rem;
    border-radius: 1rem;
    border: 1px solid rgba(216, 179, 106, 0.24);
    background: rgba(246, 240, 228, 0.05);
  }

  .legal-updated {
    color: #fff0cc;
  }

  @media (min-width: 720px) {
    .legal-meta {
      grid-template-columns: 14rem 1fr;
      align-items: start;
    }
  }
`;
document.head.append(style);
