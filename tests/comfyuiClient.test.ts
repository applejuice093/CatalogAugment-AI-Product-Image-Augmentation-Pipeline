import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComfyUIClient } from "../server/services/comfyui/comfyuiClient.ts";
import type { ComfyPromptGraph } from "../server/services/comfyui/types.ts";

describe("ComfyUIClient Unit Tests", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("checks ComfyUI health and returns boolean", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        system: { comfyui_version: "0.42.3" },
        devices: [{ name: "cuda:0 RTX 3050" }],
      }),
    } as unknown as Response);

    const client = new ComfyUIClient("http://127.0.0.1:8188", "ws://127.0.0.1:8188/ws");
    const isHealthy = await client.checkHealth();
    expect(isHealthy).toBe(true);
  });

  it("handles offline health check gracefully", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const client = new ComfyUIClient("http://127.0.0.1:8188", "ws://127.0.0.1:8188/ws");
    const isHealthy = await client.checkHealth();
    expect(isHealthy).toBe(false);
  });

  it("uploads an image buffer to ComfyUI /upload/image", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: "uploaded_product.png", subfolder: "", type: "input" }),
    } as unknown as Response);

    const client = new ComfyUIClient("http://127.0.0.1:8188", "ws://127.0.0.1:8188/ws");
    const uploadedName = await client.uploadImage(
      Buffer.from("dummy-png-data"),
      "test.png"
    );

    expect(uploadedName).toBe("uploaded_product.png");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8188/upload/image",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("queues a prompt graph and returns prompt_id", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prompt_id: "prompt-uuid-12345", number: 1 }),
    } as unknown as Response);

    const client = new ComfyUIClient("http://127.0.0.1:8188", "ws://127.0.0.1:8188/ws");
    const mockGraph: ComfyPromptGraph = {
      "1": {
        inputs: { ckpt_name: "test.safetensors" },
        class_type: "CheckpointLoaderSimple",
      },
    };

    const promptId = await client.queuePrompt(mockGraph, "client-uuid-abc");
    expect(promptId).toBe("prompt-uuid-12345");
  });

  it("fetches history outputs when prompt finishes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        "prompt-123": {
          outputs: {
            "9": {
              images: [
                { filename: "gen_001.png", subfolder: "", type: "output" },
              ],
            },
          },
        },
      }),
    } as unknown as Response);

    const client = new ComfyUIClient("http://127.0.0.1:8188", "ws://127.0.0.1:8188/ws");
    const outputs = await client.getHistoryOutputs("prompt-123");

    expect(outputs).toHaveLength(1);
    expect(outputs[0].filename).toBe("gen_001.png");
  });

  it("cancels execution via /interrupt", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
    } as unknown as Response);

    const client = new ComfyUIClient("http://127.0.0.1:8188", "ws://127.0.0.1:8188/ws");
    const cancelled = await client.cancelExecution();
    expect(cancelled).toBe(true);
  });
});
