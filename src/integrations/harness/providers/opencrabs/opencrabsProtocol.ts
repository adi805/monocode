import type { AgentModel } from "../../../../features/sessions/model/models";

/**
 * `session/new` carries the live catalog: `models.availableModels` plus the
 * server's current pick. Shaped exactly like the opencrabs ACP server's
 * response; tolerant of `_meta` nesting like the shared grok parser.
 */
export function openCrabsCatalogFromSessionNew(result: unknown): {
  available: { modelId: string; name: string }[];
  current: string | undefined;
} {
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
  return {
    available,
    current:
      typeof currentRaw === "string" && currentRaw.trim()
        ? currentRaw.trim()
        : undefined,
  };
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
