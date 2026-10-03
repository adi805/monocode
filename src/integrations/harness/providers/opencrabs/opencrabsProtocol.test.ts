import { describe, expect, it } from "vitest";
import {
  COMPACT_METHODS,
  SET_MODEL_METHODS,
  isMethodNotFound,
  openCrabsCatalogFromSessionNew,
  requestAcrossRenames,
} from "./opencrabsProtocol";

/** Records every method name the helper tries, in order. */
function stubRequest<T>(impl: (method: string) => Promise<T>) {
  const methods: string[] = [];
  const request = (
    method: string,
    _params?: unknown,
    _timeoutMs?: number,
  ): Promise<T> => {
    methods.push(method);
    return impl(method);
  };
  return { request, methods };
}

describe("requestAcrossRenames", () => {
  it("uses the prefixed name when the server answers it", async () => {
    const { request, methods } = stubRequest(async () => ({ ok: true }));
    const result = await requestAcrossRenames(
      request,
      SET_MODEL_METHODS,
      { sessionId: "s", modelId: "zai/glm-5.1" },
      1000,
    );
    expect(result).toEqual({ ok: true });
    expect(methods).toEqual(["_opencrabs/set_model"]);
  });

  it("falls back to the legacy name on method-not-found", async () => {
    const { request, methods } = stubRequest(async (method) => {
      if (method === "_opencrabs/set_model") {
        throw new Error("method not found: _opencrabs/set_model");
      }
      return { ok: true };
    });
    const result = await requestAcrossRenames(
      request,
      SET_MODEL_METHODS,
      { sessionId: "s", modelId: "zai/glm-5.1" },
      1000,
    );
    expect(result).toEqual({ ok: true });
    expect(methods).toEqual(["_opencrabs/set_model", "session/set_model"]);
  });

  it("does not fall back on an unrelated error", async () => {
    const { request, methods } = stubRequest(async () => {
      throw new Error("opencrabs acp timed out");
    });
    await expect(
      requestAcrossRenames(request, SET_MODEL_METHODS, {}, 1000),
    ).rejects.toThrow("timed out");
    expect(methods).toEqual(["_opencrabs/set_model"]);
  });

  it("surfaces the legacy error when both names are missing", async () => {
    const { request, methods } = stubRequest(async (method) => {
      throw new Error(`method not found: ${method}`);
    });
    await expect(
      requestAcrossRenames(request, SET_MODEL_METHODS, {}, 1000),
    ).rejects.toThrow("method not found: session/set_model");
    expect(methods).toEqual(["_opencrabs/set_model", "session/set_model"]);
  });

  it("compact carries the same rename pair", async () => {
    const { request, methods } = stubRequest(async (method) => {
      if (method === "_opencrabs/compact") {
        throw new Error("method not found: _opencrabs/compact");
      }
      return { stopReason: "end_turn" };
    });
    const result = await requestAcrossRenames(
      request,
      COMPACT_METHODS,
      { sessionId: "s" },
      1000,
    );
    expect(result).toEqual({ stopReason: "end_turn" });
    expect(methods).toEqual(["_opencrabs/compact", "session/compact"]);
  });
});

describe("isMethodNotFound", () => {
  it("matches the message the server actually sends", () => {
    expect(
      isMethodNotFound(new Error("method not found: _opencrabs/set_model")),
    ).toBe(true);
  });

  it("ignores other failures", () => {
    expect(isMethodNotFound(new Error("acp error -32603"))).toBe(false);
    expect(isMethodNotFound(new Error("session/prompt timed out"))).toBe(false);
  });
});

describe("openCrabsCatalogFromSessionNew", () => {
  it("prefers the schema-clean configOptions payload", () => {
    const catalog = openCrabsCatalogFromSessionNew({
      configOptions: [
        {
          id: "model",
          name: "Model",
          category: "model",
          type: "select",
          currentValue: "zai/glm-5.1",
          options: [
            {
              group: "zai",
              name: "z.ai",
              options: [{ value: "zai/glm-5.1", name: "glm-5.1" }],
            },
          ],
        },
      ],
      models: {
        availableModels: [{ modelId: "legacy/model", name: "Legacy" }],
        currentModelId: "legacy/model",
      },
    });
    expect(catalog.available).toEqual([
      { modelId: "zai/glm-5.1", name: "z.ai / glm-5.1" },
    ]);
    expect(catalog.current).toBe("zai/glm-5.1");
  });

  it("keeps the legacy current pick when configOptions omits currentValue", () => {
    const catalog = openCrabsCatalogFromSessionNew({
      configOptions: [
        {
          id: "model",
          category: "model",
          options: [
            { group: "zai", options: [{ value: "zai/glm-5.1", name: "glm-5.1" }] },
          ],
        },
      ],
      models: { currentModelId: "zai/glm-5.1" },
    });
    expect(catalog.available).toEqual([
      { modelId: "zai/glm-5.1", name: "zai / glm-5.1" },
    ]);
    expect(catalog.current).toBe("zai/glm-5.1");
  });

  it("falls back to the legacy models field when configOptions is absent", () => {
    const catalog = openCrabsCatalogFromSessionNew({
      models: {
        availableModels: [
          { modelId: "inferhub/combo/ds41", name: "inferhub / combo/ds41" },
        ],
        currentModelId: "inferhub/combo/ds41",
      },
    });
    expect(catalog.available).toEqual([
      { modelId: "inferhub/combo/ds41", name: "inferhub / combo/ds41" },
    ]);
    expect(catalog.current).toBe("inferhub/combo/ds41");
  });

  it("falls back when configOptions carries no model option", () => {
    const catalog = openCrabsCatalogFromSessionNew({
      configOptions: [{ id: "theme", category: "appearance" }],
      models: {
        availableModels: [{ modelId: "zai/glm-5", name: "z.ai / glm-5" }],
        currentModelId: "zai/glm-5",
      },
    });
    expect(catalog.available).toEqual([
      { modelId: "zai/glm-5", name: "z.ai / glm-5" },
    ]);
    expect(catalog.current).toBe("zai/glm-5");
  });
});
