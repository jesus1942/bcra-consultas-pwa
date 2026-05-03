import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import https from "node:https";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = join(process.cwd(), "dist");
const DATA_DIR = join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "studio-db.json");
const API_PREFIX = "/api/bcra";
const STUDIO_API_PREFIX = "/api/studio";
const DEFAULT_DB = {
  clients: [],
  snapshots: [],
  jobs: [],
};
const BCRA_REQUEST_DELAY_MS = 450;
const BCRA_RETRY_DELAY_MS = 700;
const BCRA_TIMEOUT_MS = 15000;

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function ensureDb() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DB_PATH)) {
    await writeFile(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
  }
}

async function readDb() {
  await ensureDb();
  const raw = await readFile(DB_PATH, "utf8");
  const db = {
    ...DEFAULT_DB,
    ...JSON.parse(raw),
  };
  normalizeDailySnapshots(db);
  return db;
}

async function writeDb(data) {
  await ensureDb();
  normalizeDailySnapshots(data);
  await writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function normalizeIdentification(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function getPriority(value) {
  return value === "urgente" || value === "vigilar" ? value : "normal";
}

function summarizeSnapshot(actual, historica, cheques) {
  const period = actual?.periodos?.[0]?.periodo ?? historica?.periodos?.[0]?.periodo ?? null;
  const actualEntities = actual?.periodos?.[0]?.entidades ?? [];
  const historicaEntities = historica?.periodos?.[0]?.entidades ?? [];
  const worstSituation = actualEntities.length > 0
    ? actualEntities.reduce((max, entity) => Math.max(max, entity.situacion), 0)
    : historicaEntities.length > 0
      ? historicaEntities.reduce((max, entity) => Math.max(max, entity.situacion), 0)
      : null;

  return {
    period,
    worstSituation,
    actualEntityCount: actualEntities.length,
    historicaEntityCount: historicaEntities.length,
    chequeCausalCount: cheques?.causales?.length ?? 0,
    displayName: actual?.denominacion ?? historica?.denominacion ?? cheques?.denominacion ?? null,
  };
}

function getSnapshotDate(isoString) {
  return isoString.slice(0, 10);
}

function buildChangeSummary(previousSnapshot, nextSnapshot) {
  if (!previousSnapshot) {
    return {
      hasChanges: true,
      reason: "first_snapshot",
      periodChanged: false,
      worstSituationChanged: false,
      actualEntityCountChanged: false,
      chequeCausalCountChanged: false,
    };
  }

  const previousSummary = previousSnapshot.summary ?? {};
  const nextSummary = nextSnapshot.summary ?? {};

  const periodChanged = previousSummary.period !== nextSummary.period;
  const worstSituationChanged = previousSummary.worstSituation !== nextSummary.worstSituation;
  const actualEntityCountChanged = previousSummary.actualEntityCount !== nextSummary.actualEntityCount;
  const chequeCausalCountChanged = previousSummary.chequeCausalCount !== nextSummary.chequeCausalCount;
  const statusChanged = previousSnapshot.status !== nextSnapshot.status;
  const hasChanges = periodChanged
    || worstSituationChanged
    || actualEntityCountChanged
    || chequeCausalCountChanged
    || statusChanged;

  return {
    hasChanges,
    reason: hasChanges ? "delta_detected" : "no_changes",
    periodChanged,
    worstSituationChanged,
    actualEntityCountChanged,
    chequeCausalCountChanged,
    statusChanged,
  };
}

function compareSnapshotsByQueryDate(left, right) {
  return new Date(right.queriedAt).getTime() - new Date(left.queriedAt).getTime();
}

function normalizeSnapshotRecord(snapshot) {
  const normalizedSnapshot = { ...snapshot };

  if (!normalizedSnapshot.snapshotDate && normalizedSnapshot.queriedAt) {
    normalizedSnapshot.snapshotDate = getSnapshotDate(normalizedSnapshot.queriedAt);
  }

  return normalizedSnapshot;
}

function getLatestDistinctDailySnapshots(snapshots) {
  const latestByDay = new Map();

  for (const snapshot of snapshots.map(normalizeSnapshotRecord).sort(compareSnapshotsByQueryDate)) {
    const key = `${snapshot.identification}:${snapshot.snapshotDate}`;
    if (!latestByDay.has(key)) {
      latestByDay.set(key, snapshot);
    }
  }

  return [...latestByDay.values()].sort(compareSnapshotsByQueryDate);
}

function normalizeDailySnapshots(db) {
  db.snapshots = getLatestDistinctDailySnapshots(db.snapshots);
  db.jobs = Array.isArray(db.jobs) ? db.jobs : [];
}

function upsertDailySnapshot(db, snapshotRecord) {
  normalizeDailySnapshots(db);
  const snapshotDate = snapshotRecord.snapshotDate;
  const identification = snapshotRecord.identification;
  const existingIndex = db.snapshots.findIndex(
    (item) => item.identification === identification && item.snapshotDate === snapshotDate,
  );

  const previousSnapshot = db.snapshots
    .filter((item) => item.identification === identification && item.snapshotDate < snapshotDate)
    .sort(compareSnapshotsByQueryDate)[0] ?? null;

  const withChangeSummary = {
    ...snapshotRecord,
    changeSummary: buildChangeSummary(previousSnapshot, snapshotRecord),
  };

  if (existingIndex >= 0) {
    db.snapshots[existingIndex] = withChangeSummary;
  } else {
    db.snapshots.unshift(withChangeSummary);
  }

  normalizeDailySnapshots(db);
  return withChangeSummary;
}

function classifyBcraFailure(statusCode, payload, fallbackMessage) {
  const message = payload?.errorMessages?.[0] ?? fallbackMessage;
  const lowerMessage = message.toLowerCase();

  if (statusCode === 404) {
    return {
      code: "not_found",
      retryable: false,
      message,
    };
  }

  if (statusCode === 503 || lowerMessage.includes("mantenimiento")) {
    return {
      code: "maintenance",
      retryable: true,
      message: "El servicio del BCRA se encuentra en mantenimiento.",
    };
  }

  if (lowerMessage.includes("timeout")) {
    return {
      code: "timeout",
      retryable: true,
      message: "El BCRA no respondió dentro del tiempo esperado.",
    };
  }

  if (lowerMessage.includes("econnreset") || lowerMessage.includes("socket hang up")) {
    return {
      code: "connection_reset",
      retryable: true,
      message: "El BCRA cerró la conexión durante la consulta.",
    };
  }

  return {
    code: "upstream_error",
    retryable: statusCode >= 500 || statusCode === 502,
    message,
  };
}

function getSnapshotStatus(endpointResults) {
  if (endpointResults.some((result) => result.ok)) {
    return "partial_or_success";
  }

  if (endpointResults.some((result) => result.failure?.code === "maintenance")) {
    return "maintenance";
  }

  if (endpointResults.every((result) => result.failure?.code === "not_found")) {
    return "not_found";
  }

  return "upstream_error";
}

function shouldRetrySnapshot(snapshot) {
  return snapshot.endpointResults?.some(
    (result) => !result.ok && result.failure?.retryable,
  ) ?? false;
}

function summarizeRefreshResults(results) {
  return results.reduce((accumulator, result) => {
    accumulator.total += 1;
    accumulator.statusCounts[result.status] = (accumulator.statusCounts[result.status] ?? 0) + 1;
    if (result.hasChanges) {
      accumulator.changed += 1;
    }
    if (result.retried) {
      accumulator.retried += 1;
    }
    if (result.status === "partial_or_success") {
      accumulator.successful += 1;
    } else {
      accumulator.failed += 1;
    }
    return accumulator;
  }, {
    total: 0,
    successful: 0,
    failed: 0,
    changed: 0,
    retried: 0,
    statusCounts: {},
  });
}

function getContentType(pathname) {
  return CONTENT_TYPES[extname(pathname)] ?? "application/octet-stream";
}

function getStaticPath(urlPath) {
  const cleanPath = urlPath === "/" ? "/index.html" : urlPath;
  const normalized = normalize(cleanPath).replace(/^(\.\.[/\\])+/, "");
  return join(DIST_DIR, normalized);
}

async function proxyBcra(req, res) {
  const targetUrl = `https://api.bcra.gob.ar${req.url.slice(API_PREFIX.length)}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const upstream = await new Promise((resolve, reject) => {
        const request = https.request(targetUrl, {
          method: "GET",
          family: 4,
          headers: {
            accept: "application/json",
            "user-agent": "bcra-consultas-pwa-railway",
          },
        }, (response) => {
          let body = "";

          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            resolve({
              statusCode: response.statusCode ?? 502,
              headers: response.headers,
              body,
            });
          });
        });

        request.setTimeout(15000, () => {
          request.destroy(new Error("Upstream timeout"));
        });
        request.on("error", reject);
        request.end();
      });

      res.statusCode = upstream.statusCode;
      const contentType = upstream.headers["content-type"];
      if (contentType) {
        res.setHeader("content-type", contentType);
      }

      res.end(upstream.body);
      return;
    } catch (error) {
      console.error("Proxy BCRA error", {
        attempt: attempt + 1,
        message: error instanceof Error ? error.message : "unknown error",
        cause: error instanceof Error && "cause" in error ? error.cause : undefined,
      });

      if (attempt === 2) {
        res.statusCode = 502;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
          status: 502,
          errorMessages: [
            `Proxy BCRA error: ${error instanceof Error ? error.message : "unknown error"}`,
          ],
        }));
        return;
      }

      await delay(350 * (attempt + 1));
    }
  }
}

async function fetchBcraJson(pathname) {
  const targetUrl = `https://api.bcra.gob.ar${pathname}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const upstream = await new Promise((resolve, reject) => {
        const request = https.request(targetUrl, {
          method: "GET",
          family: 4,
          headers: {
            accept: "application/json",
            "user-agent": "bcra-consultas-pwa-backend",
          },
        }, (response) => {
          let body = "";

          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            resolve({
              statusCode: response.statusCode ?? 502,
              body,
            });
          });
        });

        request.setTimeout(BCRA_TIMEOUT_MS, () => {
          request.destroy(new Error("Upstream timeout"));
        });
        request.on("error", reject);
        request.end();
      });

      const payload = upstream.body ? JSON.parse(upstream.body) : {};
      const ok = upstream.statusCode >= 200 && upstream.statusCode < 300;

      return {
        ok,
        statusCode: upstream.statusCode,
        payload,
        failure: ok
          ? null
          : classifyBcraFailure(
              upstream.statusCode,
              payload,
              `BCRA status ${upstream.statusCode}`,
            ),
      };
    } catch (error) {
      const failure = classifyBcraFailure(
        502,
        { errorMessages: [error instanceof Error ? error.message : "unknown error"] },
        "Proxy BCRA error",
      );

      if (attempt === 2) {
        return {
          ok: false,
          statusCode: 502,
          payload: {
            status: 502,
            errorMessages: [failure.message],
          },
          failure,
        };
      }

      await delay(BCRA_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  return {
    ok: false,
    statusCode: 502,
    payload: {
      status: 502,
      errorMessages: ["Proxy BCRA error: unknown error"],
    },
    failure: classifyBcraFailure(502, { errorMessages: ["unknown error"] }, "Proxy BCRA error"),
  };
}

async function queryClientSnapshot(identification) {
  const cleanId = normalizeIdentification(identification);
  const queriedAt = new Date().toISOString();
  const actual = await fetchBcraJson(`/CentralDeDeudores/v1.0/Deudas/${cleanId}`);
  await delay(BCRA_REQUEST_DELAY_MS);
  const historica = await fetchBcraJson(`/CentralDeDeudores/v1.0/Deudas/Historicas/${cleanId}`);
  await delay(BCRA_REQUEST_DELAY_MS);
  const cheques = await fetchBcraJson(`/CentralDeDeudores/v1.0/Deudas/ChequesRechazados/${cleanId}`);

  const endpointResults = [
    { endpoint: "actual", ...actual },
    { endpoint: "historica", ...historica },
    { endpoint: "cheques", ...cheques },
  ];

  const snapshot = {
    identification: cleanId,
    queriedAt,
    snapshotDate: getSnapshotDate(queriedAt),
    status: getSnapshotStatus(endpointResults),
    actualStatus: actual.statusCode,
    historicaStatus: historica.statusCode,
    chequesStatus: cheques.statusCode,
    actual: actual.ok ? actual.payload.results : null,
    historica: historica.ok ? historica.payload.results : null,
    cheques: cheques.ok ? cheques.payload.results : null,
    endpointResults: endpointResults.map((result) => ({
      endpoint: result.endpoint,
      ok: result.ok,
      statusCode: result.statusCode,
      failure: result.failure,
    })),
    errors: endpointResults
      .filter((item) => !item.ok)
      .map((item) => item.failure?.message ?? `BCRA status ${item.statusCode}`),
  };

  return {
    snapshot,
    summary: summarizeSnapshot(snapshot.actual, snapshot.historica, snapshot.cheques),
  };
}

async function handleStudioApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === `${STUDIO_API_PREFIX}/health`) {
    json(res, 200, {
      ok: true,
      service: "bcra-consultas-backend",
      now: new Date().toISOString(),
    });
    return;
  }

  if (req.method === "GET" && pathname === `${STUDIO_API_PREFIX}/summary`) {
    const db = await readDb();
    const urgent = db.clients.filter((client) => client.priority === "urgente").length;
    const watch = db.clients.filter((client) => client.priority === "vigilar").length;
    const latestSnapshots = db.snapshots.slice(0, 20);
    const latestJob = db.jobs[0] ?? null;
    const maintenanceCount = latestSnapshots.filter((snapshot) => snapshot.status === "maintenance").length;
    const partialCount = latestSnapshots.filter((snapshot) => snapshot.status === "partial_or_success").length;
    const changedCount = latestSnapshots.filter((snapshot) => snapshot.changeSummary?.hasChanges).length;
    json(res, 200, {
      clientCount: db.clients.length,
      snapshotCount: db.snapshots.length,
      urgent,
      watch,
      maintenanceCount,
      partialCount,
      changedCount,
      latestJob,
    });
    return;
  }

  if (req.method === "GET" && pathname === `${STUDIO_API_PREFIX}/jobs`) {
    const db = await readDb();
    json(res, 200, db.jobs);
    return;
  }

  if (req.method === "GET" && pathname === `${STUDIO_API_PREFIX}/jobs/latest`) {
    const db = await readDb();
    json(res, 200, db.jobs[0] ?? null);
    return;
  }

  if (req.method === "GET" && pathname === `${STUDIO_API_PREFIX}/clients`) {
    const db = await readDb();
    json(res, 200, db.clients);
    return;
  }

  if (req.method === "POST" && pathname === `${STUDIO_API_PREFIX}/clients`) {
    const body = await getRequestBody(req);
    const identification = normalizeIdentification(body.identification);

    if (identification.length !== 11) {
      json(res, 400, { error: "identification must have 11 digits" });
      return;
    }

    const db = await readDb();
    if (db.clients.some((client) => client.identification === identification)) {
      json(res, 409, { error: "client already exists" });
      return;
    }

    const client = {
      identification,
      displayName: body.displayName ? String(body.displayName) : null,
      notes: body.notes ? String(body.notes) : "",
      priority: getPriority(body.priority),
      createdAt: new Date().toISOString(),
      lastCheckedAt: null,
      lastPeriod: null,
      worstSituation: null,
      entityCount: 0,
    };

    db.clients.unshift(client);
    await writeDb(db);
    json(res, 201, client);
    return;
  }

  if (pathname.startsWith(`${STUDIO_API_PREFIX}/clients/`)) {
    const segments = pathname.slice(STUDIO_API_PREFIX.length + 1).split("/");
    const [, identification, subresource] = segments;
    const cleanId = normalizeIdentification(identification);

    if (cleanId.length !== 11) {
      json(res, 400, { error: "invalid identification" });
      return;
    }

    if (req.method === "PATCH" && !subresource) {
      const body = await getRequestBody(req);
      const db = await readDb();
      const client = db.clients.find((item) => item.identification === cleanId);

      if (!client) {
        json(res, 404, { error: "client not found" });
        return;
      }

      client.displayName = body.displayName !== undefined ? String(body.displayName || "") || null : client.displayName;
      client.notes = body.notes !== undefined ? String(body.notes) : client.notes;
      client.priority = body.priority !== undefined ? getPriority(body.priority) : client.priority;
      await writeDb(db);
      json(res, 200, client);
      return;
    }

    if (req.method === "DELETE" && !subresource) {
      const db = await readDb();
      const before = db.clients.length;
      db.clients = db.clients.filter((item) => item.identification !== cleanId);
      db.snapshots = db.snapshots.filter((item) => item.identification !== cleanId);

      if (db.clients.length === before) {
        json(res, 404, { error: "client not found" });
        return;
      }

      await writeDb(db);
      json(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && subresource === "snapshots") {
      const db = await readDb();
      const snapshots = db.snapshots.filter((item) => item.identification === cleanId);
      json(res, 200, snapshots);
      return;
    }

    if (req.method === "POST" && subresource === "query") {
      const db = await readDb();
      const client = db.clients.find((item) => item.identification === cleanId);

      if (!client) {
        json(res, 404, { error: "client not found" });
        return;
      }

      const { snapshot, summary } = await queryClientSnapshot(cleanId);
      const persistedSnapshot = upsertDailySnapshot(db, {
        id: `${cleanId}-${Date.now()}`,
        ...snapshot,
        summary,
      });
      client.displayName = summary.displayName ?? client.displayName;
      client.lastCheckedAt = snapshot.queriedAt;
      client.lastPeriod = summary.period;
      client.worstSituation = summary.worstSituation;
      client.entityCount = summary.actualEntityCount;
      await writeDb(db);
      json(res, 200, { client, snapshot: persistedSnapshot, summary });
      return;
    }
  }

  if (req.method === "POST" && pathname === `${STUDIO_API_PREFIX}/jobs/daily-refresh`) {
    const db = await readDb();
    const startedAt = new Date().toISOString();
    const job = {
      id: `job-${Date.now()}`,
      kind: "daily_refresh",
      startedAt,
      finishedAt: null,
      clientCount: db.clients.length,
      passCount: 0,
      retryQueueCount: 0,
      summary: null,
      results: [],
    };
    const results = [];
    const retryQueue = [];

    for (const client of db.clients) {
      job.passCount += 1;
      const { snapshot, summary } = await queryClientSnapshot(client.identification);
      const persistedSnapshot = upsertDailySnapshot(db, {
        id: `${client.identification}-${Date.now()}-${results.length}`,
        ...snapshot,
        summary,
      });
      client.displayName = summary.displayName ?? client.displayName;
      client.lastCheckedAt = snapshot.queriedAt;
      client.lastPeriod = summary.period;
      client.worstSituation = summary.worstSituation;
      client.entityCount = summary.actualEntityCount;
      results.push({
        identification: client.identification,
        snapshotDate: persistedSnapshot.snapshotDate,
        status: persistedSnapshot.status,
        hasChanges: persistedSnapshot.changeSummary?.hasChanges ?? false,
        retried: false,
        attempts: 1,
        actualStatus: snapshot.actualStatus,
        historicaStatus: snapshot.historicaStatus,
        chequesStatus: snapshot.chequesStatus,
      });

      if (shouldRetrySnapshot(persistedSnapshot)) {
        retryQueue.push(client.identification);
      }

      await delay(250);
    }

    job.retryQueueCount = retryQueue.length;

    for (const identification of retryQueue) {
      const client = db.clients.find((item) => item.identification === identification);
      const result = results.find((item) => item.identification === identification);
      if (!client || !result) {
        continue;
      }

      await delay(1000);
      job.passCount += 1;
      const { snapshot, summary } = await queryClientSnapshot(client.identification);
      const persistedSnapshot = upsertDailySnapshot(db, {
        id: `${client.identification}-${Date.now()}-retry`,
        ...snapshot,
        summary,
      });
      client.displayName = summary.displayName ?? client.displayName;
      client.lastCheckedAt = snapshot.queriedAt;
      client.lastPeriod = summary.period;
      client.worstSituation = summary.worstSituation;
      client.entityCount = summary.actualEntityCount;
      result.snapshotDate = persistedSnapshot.snapshotDate;
      result.status = persistedSnapshot.status;
      result.hasChanges = persistedSnapshot.changeSummary?.hasChanges ?? false;
      result.retried = true;
      result.attempts = 2;
      result.actualStatus = snapshot.actualStatus;
      result.historicaStatus = snapshot.historicaStatus;
      result.chequesStatus = snapshot.chequesStatus;
    }

    const finishedAt = new Date().toISOString();
    job.finishedAt = finishedAt;
    job.summary = summarizeRefreshResults(results);
    job.results = results;
    db.jobs.unshift(job);
    db.jobs = db.jobs.slice(0, 20);
    await writeDb(db);
    json(res, 200, {
      refreshedAt: finishedAt,
      job,
      clientCount: db.clients.length,
      results,
    });
    return;
  }

  json(res, 404, { error: "studio route not found" });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const staticPath = getStaticPath(url.pathname);
  const fallbackPath = url.pathname === "/aviso-legal.html"
    ? join(DIST_DIR, "aviso-legal.html")
    : join(DIST_DIR, "index.html");

  const filePath = existsSync(staticPath) ? staticPath : fallbackPath;

  try {
    if (extname(filePath) === ".html") {
      const html = await readFile(filePath, "utf8");
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(html);
      return;
    }

    res.statusCode = 200;
    res.setHeader("content-type", getContentType(filePath));
    createReadStream(filePath).pipe(res);
  } catch {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }

  if (req.url.startsWith(API_PREFIX)) {
    await proxyBcra(req, res);
    return;
  }

  if (req.url.startsWith(STUDIO_API_PREFIX)) {
    try {
      await handleStudioApi(req, res);
    } catch (error) {
      json(res, 500, {
        error: error instanceof Error ? error.message : "unknown backend error",
      });
    }
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
