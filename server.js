import { createReadStream, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import https from "node:https";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 3000);
const DIST_DIR = join(process.cwd(), "dist");
const API_PREFIX = "/api/bcra";

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
