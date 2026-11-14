import { randomUUID } from "node:crypto";
import { config } from "../../config/unifiedConfig.ts";
import type {
  AugmentationProgress,
  ComfyHistoryResponse,
  ComfyImageOutput,
  ComfyPromptGraph,
  ComfyQueuePromptRequest,
  ComfyQueuePromptResponse,
  ComfySystemStats,
  ComfyWsMessage,
} from "./types.ts";

export interface IComfyUIClient {
  checkHealth(): Promise<boolean>;
  getSystemStats(): Promise<ComfySystemStats | null>;
  uploadImage(buffer: Buffer, filename: string): Promise<string>;
  queuePrompt(prompt: ComfyPromptGraph, clientId?: string): Promise<string>;
  trackExecution(
    promptId: string,
    clientId: string,
    onProgress?: (progress: AugmentationProgress) => void,
    timeoutMs?: number
  ): Promise<ComfyImageOutput[]>;
  downloadImage(imageOutput: ComfyImageOutput): Promise<Buffer>;
  cancelExecution(): Promise<boolean>;
}

export class ComfyUIClient implements IComfyUIClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(
    baseUrl: string = config.comfyui.baseUrl,
    wsUrl: string = config.comfyui.wsUrl
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.wsUrl = wsUrl.replace(/\/+$/, "");
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(4000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  public async getSystemStats(): Promise<ComfySystemStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/system_stats`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return null;
      return (await response.json()) as ComfySystemStats;
    } catch {
      return null;
    }
  }

  /**
   * Upload an input image or mask buffer to ComfyUI
   */
  public async uploadImage(buffer: Buffer, filename: string): Promise<string> {
    const formData = new globalThis.FormData();
    const blob = new globalThis.Blob([buffer], { type: "image/png" });
    formData.append("image", blob, filename);
    formData.append("overwrite", "true");

    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`Failed to upload image to ComfyUI (${response.status}): ${errText}`);
    }

    const result = (await response.json()) as { name: string };
    return result.name;
  }

  /**
   * Queue an execution graph in ComfyUI
   */
  public async queuePrompt(
    prompt: ComfyPromptGraph,
    clientId: string = randomUUID()
  ): Promise<string> {
    const payload: ComfyQueuePromptRequest = {
      client_id: clientId,
      prompt,
    };

    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errData = await response.text().catch(() => "");
      throw new Error(`Failed to queue prompt on ComfyUI (${response.status}): ${errData}`);
    }

    const data = (await response.json()) as ComfyQueuePromptResponse;
    if (!data.prompt_id) {
      throw new Error("ComfyUI did not return a valid prompt_id.");
    }

    return data.prompt_id;
  }

  /**
   * Track execution lifecycle via WebSocket until completion or timeout
   */
  public async trackExecution(
    promptId: string,
    clientId: string,
    onProgress?: (progress: AugmentationProgress) => void,
    timeoutMs: number = config.comfyui.timeoutMs
  ): Promise<ComfyImageOutput[]> {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const collectedImages: ComfyImageOutput[] = [];
      let timeoutTimer: NodeJS.Timeout | null = null;
      let ws: WebSocket | null = null;

      const cleanup = () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (ws) {
          try {
            ws.close();
          } catch {
            // ignore close errors
          }
        }
      };

      const finishSuccess = (images: ComfyImageOutput[]) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        resolve(images);
      };

      const finishError = (error: Error) => {
        if (isSettled) return;
        isSettled = true;
        cleanup();
        reject(error);
      };

      timeoutTimer = setTimeout(() => {
        finishError(
          new Error(`ComfyUI execution timed out after ${timeoutMs}ms for prompt ${promptId}`)
        );
      }, timeoutMs);

      try {
        const fullWsUrl = `${this.wsUrl}?clientId=${encodeURIComponent(clientId)}`;
        ws = new globalThis.WebSocket(fullWsUrl);

        ws.onopen = () => {
          onProgress?.({
            jobId: clientId,
            promptId,
            progressPercent: 5,
            currentNode: null,
            statusText: "Connected to ComfyUI. Awaiting execution...",
          });
        };

        ws.onmessage = (event) => {
          try {
            if (typeof event.data !== "string") return;
            const message = JSON.parse(event.data) as ComfyWsMessage;

            if (message.type === "execution_start" && message.data.prompt_id === promptId) {
              onProgress?.({
                jobId: clientId,
                promptId,
                progressPercent: 10,
                currentNode: null,
                statusText: "Execution started...",
              });
            } else if (
              message.type === "executing" &&
              message.data.prompt_id === promptId
            ) {
              if (message.data.node === null) {
                // Node is null indicates the entire prompt finished!
                // If we didn't receive executed image events directly, query history
                setTimeout(async () => {
                  if (collectedImages.length > 0) {
                    finishSuccess(collectedImages);
                  } else {
                    try {
                      const historyImages = await this.getHistoryOutputs(promptId);
                      finishSuccess(historyImages);
                    } catch (err) {
                      finishError(
                        new Error(
                          `Execution finished but failed to retrieve history: ${
                            err instanceof Error ? err.message : String(err)
                          }`
                        )
                      );
                    }
                  }
                }, 500);
              } else {
                onProgress?.({
                  jobId: clientId,
                  promptId,
                  progressPercent: 30,
                  currentNode: message.data.node,
                  statusText: `Executing node: ${message.data.node}`,
                });
              }
            } else if (
              message.type === "progress" &&
              message.data.prompt_id === promptId
            ) {
              const current = message.data.value || 0;
              const max = message.data.max || 1;
              const percent = Math.min(95, Math.floor((current / max) * 85) + 10);

              onProgress?.({
                jobId: clientId,
                promptId,
                progressPercent: percent,
                currentNode: message.data.node ?? null,
                statusText: `Sampling: ${current}/${max} steps`,
              });
            } else if (
              message.type === "executed" &&
              message.data.prompt_id === promptId
            ) {
              if (message.data.output?.images) {
                for (const img of message.data.output.images) {
                  collectedImages.push(img);
                }
              }
            } else if (
              message.type === "execution_error" &&
              message.data.prompt_id === promptId
            ) {
              const errNode = message.data.node_type || message.data.node_id || "unknown";
              const errMsg = message.data.exception_message || "Unknown execution error";
              finishError(new Error(`ComfyUI node [${errNode}] failed: ${errMsg}`));
            }
          } catch (parseErr) {
            console.warn("[ComfyUIClient] Failed to parse WebSocket message:", parseErr);
          }
        };

        ws.onerror = (err) => {
          console.warn("[ComfyUIClient] WebSocket error:", err);
          // Fall back to polling history if WebSocket encounters issues
          this.pollHistory(promptId, onProgress, finishSuccess, finishError);
        };
      } catch {
        // Fall back to HTTP polling if WebSocket initialization fails
        this.pollHistory(promptId, onProgress, finishSuccess, finishError);
      }
    });
  }

  /**
   * Fallback polling mechanism when WebSockets are unavailable or interrupted
   */
  private async pollHistory(
    promptId: string,
    onProgress: ((progress: AugmentationProgress) => void) | undefined,
    onSuccess: (images: ComfyImageOutput[]) => void,
    onError: (err: Error) => void
  ): Promise<void> {
    const startTime = Date.now();
    const interval = 2000;

    const check = async () => {
      if (Date.now() - startTime > config.comfyui.timeoutMs) {
        return onError(new Error(`Polling timed out for prompt ${promptId}`));
      }

      try {
        const images = await this.getHistoryOutputs(promptId);
        if (images.length > 0) {
          return onSuccess(images);
        }

        onProgress?.({
          jobId: promptId,
          promptId,
          progressPercent: 50,
          currentNode: null,
          statusText: "Processing in queue (polling)...",
        });

        setTimeout(check, interval);
      } catch {
        setTimeout(check, interval);
      }
    };

    setTimeout(check, 1000);
  }

  /**
   * Fetch output images from /history/<promptId>
   */
  public async getHistoryOutputs(promptId: string): Promise<ComfyImageOutput[]> {
    const response = await fetch(`${this.baseUrl}/history/${promptId}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch history for prompt ${promptId}`);
    }

    const history = (await response.json()) as ComfyHistoryResponse;
    const item = history[promptId];
    if (!item || !item.outputs) {
      return [];
    }

    const images: ComfyImageOutput[] = [];
    for (const output of Object.values(item.outputs)) {
      if (output.images && Array.isArray(output.images)) {
        images.push(...output.images);
      }
    }

    return images;
  }

  /**
   * Download a generated image binary via /view
   */
  public async downloadImage(imageOutput: ComfyImageOutput): Promise<Buffer> {
    const params = new URLSearchParams({
      filename: imageOutput.filename,
      subfolder: imageOutput.subfolder || "",
      type: imageOutput.type || "output",
    });

    const response = await fetch(`${this.baseUrl}/view?${params.toString()}`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download image from ComfyUI (${response.status}): ${imageOutput.filename}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Interrupt current execution on ComfyUI
   */
  public async cancelExecution(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/interrupt`, {
        method: "POST",
        signal: AbortSignal.timeout(4000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const defaultComfyUIClient = new ComfyUIClient();
