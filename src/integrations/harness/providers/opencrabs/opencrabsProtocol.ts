import type { AgentModel } from "../../../../features/sessions/model/models";

/**
 * Upstream moved `session/set_model` and `session/compact` under the
 * `_opencrabs/` prefix and keeps the legacy spelling for one release. Our
 * deployed 0.5.4 predates the move, so it answers the prefixed name with
 * `-32601 method not found` and only the legacy name works; a post-migration
 * server is the reverse. Trying the prefixed name first and falling back on
 * method-not-found keeps one adapter build working against both.
 */
export const SET_MODEL_METHODS = [
  "_opencrabs/set_model",
  "session/set_model",
] as const;

export const COMPACT_METHODS = [
  "_opencrabs/compact",
  "session/compact",
] as const;

/**
 * The JSON-RPC client keeps only the error message and drops the numeric code,
 * so method-not-found is matched from the text the server sends:
 * `method not found: <name>`.
 */
export function isMethodNotFound(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /method not found/i.test(message);
}

/**
 * Call the first method name and retry with the second only when the server
 * says the first does not exist. Any other failure propagates untouched, so a
 * real error is never masked by a rename fallback.
 */
export async function requestAcrossRenames<T>(
  request: (method: string, params?: unknown, timeoutMs?: number) => Promise<T>,
  methods: readonly [string, string],
  params: unknown,
  timeoutMs: number,
): Promise<T> {
  try {
    return await request(methods[0], params, timeoutMs);
  } catch (error) {
    if (!isMethodNotFound(error)) throw error;
    return request(methods[1], params, timeoutMs);
  }
}

/**
 * The schema-clean catalog. Upstream emits `configOptions` alongside the
 * non-schema `models` field so a client generated from the v1 schema can still
 * see the picker (#1815 F4): one `select` option with `category: "model"`,
 * whose `options` are provider groups holding `{ value, name }` leaves.
 * Returns empty when the field is absent, which is the case for a 0.5.4
 * server, so the caller falls through to the legacy `models` field.
 */
function catalogFromConfigOptions(result: unknown): {
  available: { modelId: string; name: string }[];
  current: string | undefined;
} {
  const rec = asRecord(result);
  const options = Array.isArray(rec?.configOptions) ? rec.configOptions : [];
  const modelOption = options
    .map((value) => asRecord(value))
    .find((option) => {
      const category = String(option?.category ?? "").trim();
      const id = String(option?.id ?? "").trim();
      return category === "model" || id === "model";
    });
  if (!modelOption) return { available: [], current: undefined };
  const groups = Array.isArray(modelOption.options) ? modelOption.options : [];
  const available = groups.flatMap((group) => {
    const groupRec = asRecord(group);
    const groupName = String(groupRec?.name ?? groupRec?.group ?? "").trim();
    const leaves = Array.isArray(groupRec?.options) ? groupRec.options : [];
    return leaves.flatMap((leaf) => {
      const leafRec = asRecord(leaf);
      const modelId = String(leafRec?.value ?? "").trim();
      if (!modelId) return [];
      const leafName = String(leafRec?.name ?? modelId).trim() || modelId;
      return [
        {
          modelId,
          name: groupName ? `${groupName} / ${leafName}` : leafName,
        },
      ];
    });
  });
  const currentRaw = modelOption.currentValue;
  return {
    available,
    current:
      typeof currentRaw === "string" && currentRaw.trim()
        ? currentRaw.trim()
        : undefined,
  };
}

/**
 * `session/new` carries the live catalog: the schema-clean `configOptions`
 * when the server emits it, otherwise `models.availableModels` plus the
 * server's current pick. Shaped exactly like the opencrabs ACP server's
 * response; tolerant of `_meta` nesting like the shared grok parser.
 */
export function openCrabsCatalogFromSessionNew(result: unknown): {
  available: { modelId: string; name: string }[];
  current: string | undefined;
} {
  const clean = catalogFromConfigOptions(result);
  const rec = asRecord(result);
  const models = asRecord(rec?.models);
  const meta = asRecord(asRecord(rec?._meta)?.modelState) ?? asRecord(rec?._meta);
  const raw =
    (Array.isArray(models?.availableModels) && models.availableModels) ||
    (Array.isArray(meta?.availableModels) && meta.availableModels) ||
    [];
  const available = raw.flatMap((item) => {
    const entry = asRecord(item);
    const modelId = String(entry?.modelId ?? entry?.model_id ?? "").trim();
    if (!modelId) return [];
    return [
      {
        modelId,
        name: String(entry?.name ?? modelId).trim() || modelId,
      },
    ];
  });
  const currentRaw = models?.currentModelId ?? meta?.currentModelId;
  const legacyCurrent =
    typeof currentRaw === "string" && currentRaw.trim()
      ? currentRaw.trim()
      : undefined;
  // Prefer the schema-clean payload when the server emits one, but keep the
  // legacy current pick as a fallback so a configOptions block without a
  // currentValue still shows which model is active.
  if (clean.available.length > 0) {
    return {
      available: clean.available,
      current: clean.current ?? legacyCurrent,
    };
  }
  return { available, current: legacyCurrent };
}

/** Live catalog rows -> MonoCode model entries for the picker overlay. */
export function catalogToModels(
  catalog: ReturnType<typeof openCrabsCatalogFromSessionNew>,
): AgentModel[] {
  return catalog.available.map((entry) => ({
    id: `opencrabs:${entry.modelId}`,
    harness: "opencrabs" as const,
    name: entry.name,
    nativeId: entry.modelId,
  }));
}

/**
 * The server's `available_commands_update` push: built-ins, skills, and the
 * user's commands.toml entries, slash-able from the picker. Returns null for
 * every other update so the caller's session/update routing is untouched.
 */
export function nativeCommandsFromUpdate(
  params: unknown,
): { name: string; description: string }[] | null {
  const update = asRecord(asRecord(params)?.update);
  if (update?.sessionUpdate !== "available_commands_update") return null;
  const list = Array.isArray(update.availableCommands)
    ? update.availableCommands
    : [];
  return list.flatMap((value) => {
    const row = asRecord(value);
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    if (!name || /[\s/\\]/.test(name)) return [];
    return [
      {
        name,
        description: typeof row?.description === "string" ? row.description : "",
      },
    ];
  });
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
