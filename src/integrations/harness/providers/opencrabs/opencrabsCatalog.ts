import { homeDir } from "../../../../platform/tauri/fs";
import { AcpClient } from "../../core/acp";
import {
  killChild,
  resolveOpenCrabsBinary,
  spawnChild,
  unwatchChild,
  watchChild,
} from "../../core/child";
import {
  catalogToModels,
  openCrabsCatalogFromSessionNew,
} from "./opencrabsProtocol";

const PROBE_ID = "monocode-opencrabs-probe";
const DISCOVERY_TIMEOUT_MS = 45_000;
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Host-side catalog discovery (remote-host contract): spawn `<binary> acp`,
 * run initialize + session/new, and map `models.availableModels` to picker
 * rows. Mirrors the hermes catalog probe; the in-app session flow does its
 * own live-catalog population from the real session.
 */
export async function discoverOpenCrabsModels(
  workingDirectory?: string,
): Promise<ReturnType<typeof catalogToModels>> {
  const { path } = await resolveOpenCrabsBinary();
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
    () => acp.close(new Error("OpenCrabs catalog probe exited")),
  );

  try {
    await spawnChild(probeId, path, ["acp"], cwd, undefined, "opencrabs");
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
        return catalogToModels(openCrabsCatalogFromSessionNew(created));
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
  return new Promise<T>((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      onTimeout();
      rejectPromise(new Error(`OpenCrabs catalog probe timed out (${ms}ms)`));
    }, ms);
    run()
      .then((value) => {
        clearTimeout(timer);
        resolvePromise(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        rejectPromise(error);
      });
  });
}
