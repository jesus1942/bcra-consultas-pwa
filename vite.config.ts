import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

function bcraDevProxy() {
  const prefix = "/api/bcra";

  return {
    name: "bcra-dev-proxy",
    configureServer(server: {
      middlewares: {
        use: (
          handler: (
            req: import("node:http").IncomingMessage,
            res: import("node:http").ServerResponse,
            next: () => void,
          ) => void | Promise<void>,
        ) => void;
      };
    }) {
      server.middlewares.use(async (req, res, next) => {
        const requestUrl = req.url;

        if (!requestUrl?.startsWith(prefix)) {
          next();
          return;
        }

        const upstreamPath = requestUrl.slice(prefix.length);
        const targetUrl = `https://api.bcra.gob.ar${upstreamPath}`;

        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const upstream = await fetch(targetUrl, {
              headers: {
                accept: "application/json",
                "user-agent": "bcra-consultas-pwa-dev",
              },
            });

            res.statusCode = upstream.status;
            const contentType = upstream.headers.get("content-type");
            if (contentType) {
              res.setHeader("content-type", contentType);
            }

            const body = await upstream.text();
            res.end(body);
            return;
          } catch (error) {
            if (attempt === 2) {
              const message = error instanceof Error ? error.message : "unknown error";
              res.statusCode = 502;
              res.setHeader("content-type", "application/json; charset=utf-8");
              res.end(JSON.stringify({
                status: 502,
                errorMessages: [`Proxy BCRA error: ${message}`],
              }));
              return;
            }

            await new Promise((resolveAttempt) => setTimeout(resolveAttempt, 350 * (attempt + 1)));
          }
        }
      });
    },
  };
}

export default defineConfig(() => ({
  base: process.env.VITE_PUBLIC_BASE ?? "/",
  plugins: [react(), bcraDevProxy()],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.1.0"),
    __LEGAL_UPDATED_AT__: JSON.stringify("diciembre de 2025"),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        legal: resolve(__dirname, "aviso-legal.html"),
      },
    },
  },
}));
