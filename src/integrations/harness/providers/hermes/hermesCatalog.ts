import { homeDir } from "../../../../platform/tauri/fs";
import {
  setHarnessModels,
  type AgentModel,
} from "../../../../features/sessions/model/models";
import { AcpClient } from "../../core/acp";
import {
  killChild,
  resolveHermesBinary,
  spawnChild,
  unwatchChild,
  watchChild,
} from "../../core/child";
import { modelsFromHermesSession } from "./hermesProtocol";

const PROBE_ID = "monocode-hermes-probe";
const DISCOVERY_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 20_000;

let inflight: Promise<void> | null = null;

const CATALOG_CACHE_KEY = "monocode.hermesCatalogCache.v1";

function readCatalogCache(): AgentModel[] {
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AgentModel[]) : [];
  } catch {
    return [];
  }
}

function writeCatalogCache(models: AgentModel[]): void {
  try {
    window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(models));
  } catch {
    // Storage may be unavailable; caching is best-effort only.
  }
}

export function refreshHermesCatalog(): Promise<void> {
  if (inflight) return inflight;
  inflight = discoverHermesModels()
    .then((models) => {
      if (models.length > 0) {
        setHarnessModels("hermes", models);
        writeCatalogCache(models);
        console.info(
          `[monocode] hermes catalog loaded: ${models.length} models`,
        );
      } else {
        // Surface a visible warning: an empty catalog used to fail silently
        // and left the model picker on the static fallback forever.
        console.warn(
          "[monocode] hermes catalog probe returned 0 models; keeping fallback",
        );
      }
    })
    .catch((error: unknown) => {
      console.warn("[monocode] hermes catalog probe failed:", error);
      const cached = readCatalogCache();
      if (cached.length > 0) {
        setHarnessModels("hermes", cached);
        console.info(
          `[monocode] hermes catalog restored from cache: ${cached.length} models`,
        );
      }
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function discoverHermesModels(
  workingDirectory?: string,
): Promise<AgentModel[]> {
  const { path } = await resolveHermesBinary();
  const cwd = workingDirectory ?? (await homeDir());
  const probeId = `${PROBE_ID}-${crypto.randomUUID()}`;
  const acp = new AcpClient(probeId, {
    onRequest: (id, method) => {
      void acp
        .respondError(id, {
          code: -32601,
          message: `Method not found: ${method}`,
        })
        .catch(() => undefined);
    },
  });

  const stop = async () => {
    acp.close();
    unwatchChild(probeId);
    await killChild(probeId).catch(() => undefined);
  };

  watchChild(
    probeId,
    (line) => acp.pushLine(line),
    () => acp.close(new Error("Hermes catalog probe exited")),
  );

  try {
    await spawnChild(probeId, path, ["acp"], cwd, undefined, "hermes");
    return await withTimeout(
      DISCOVERY_TIMEOUT_MS,
      async () => {
        await acp.request(
          "initialize",
          {
            protocolVersion: 1,
            clientCapabilities: {
              fs: { readTextFile: false, writeTextFile: false },
              terminal: false,
            },
            clientInfo: { name: "monocode", version: "0.1.0" },
          },
          REQUEST_TIMEOUT_MS,
        );
        const created = await acp.request<unknown>(
          "session/new",
          { cwd, mcpServers: [] },
          REQUEST_TIMEOUT_MS,
        );
        return modelsFromHermesSession(created);
      },
      () => {
        void stop();
      },
    );
  } finally {
    await stop();
  }
}

function withTimeout<T>(
  ms: number,
  run: () => Promise<T>,
  onTimeout: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error("Hermes model discovery timed out"));
    }, ms);
    void run().then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
