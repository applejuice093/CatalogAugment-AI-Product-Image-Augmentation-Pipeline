import { describe, expect, it } from "vitest";
import {
  WORKFLOW_WF01,
  WORKFLOW_WF02,
  WORKFLOW_WF03,
  WorkflowRegistry,
} from "../server/services/comfyui/workflowRegistry.ts";

describe("WorkflowRegistry Unit Tests", () => {
  it("initializes with default workflows WF-01, WF-02, and WF-03", () => {
    const registry = new WorkflowRegistry();
    const workflows = registry.listWorkflows();

    expect(workflows.length).toBeGreaterThanOrEqual(3);
    expect(registry.getWorkflow("wf-01-background-replacement")).toBeDefined();
    expect(registry.getWorkflow("wf-02-lighting-shadow")).toBeDefined();
    expect(registry.getWorkflow("wf-03-lifestyle-scene")).toBeDefined();
  });

  it("builds an executable prompt by safely interpolating parameters", () => {
    const registry = new WorkflowRegistry();
    const workflow = registry.getWorkflow("wf-01-background-replacement")!;

    const executable = registry.buildExecutablePrompt(
      workflow,
      {
        workflowId: "wf-01-background-replacement",
        prompt: "luxury watch on obsidian stone",
        negativePrompt: "lowres, noisy",
        seed: 777,
        steps: 35,
        cfg: 8.5,
        denoise: 0.75,
        sampler: "dpmpp_2m",
      },
      "custom_input_watch.png",
      "custom_mask_watch.png"
    );

    // Verify Image node
    expect(executable["2"].inputs.image).toBe("custom_input_watch.png");

    // Verify Mask node
    expect(executable["3"].inputs.image).toBe("custom_mask_watch.png");

    // Verify Positive Prompt
    expect(executable["5"].inputs.text).toBe("luxury watch on obsidian stone");

    // Verify Negative Prompt
    expect(executable["6"].inputs.text).toBe("lowres, noisy");

    // Verify Sampler node
    expect(executable["8"].inputs.seed).toBe(777);
    expect(executable["8"].inputs.steps).toBe(35);
    expect(executable["8"].inputs.cfg).toBe(8.5);
    expect(executable["8"].inputs.denoise).toBe(0.75);
    expect(executable["8"].inputs.sampler_name).toBe("dpmpp_2m");
  });

  it("clamps parameter boundaries to protect GPU resources", () => {
    const registry = new WorkflowRegistry();
    const workflow = registry.getWorkflow("wf-01-background-replacement")!;

    const executable = registry.buildExecutablePrompt(
      workflow,
      {
        workflowId: "wf-01-background-replacement",
        steps: 999, // Should clamp to max 100
        cfg: 100, // Should clamp to max 30
        denoise: 5.0, // Should clamp to max 1.0
      },
      "image.png"
    );

    expect(executable["8"].inputs.steps).toBe(100);
    expect(executable["8"].inputs.cfg).toBe(30);
    expect(executable["8"].inputs.denoise).toBe(1.0);
  });

  it("loads external workflows from directory gracefully", async () => {
    const registry = new WorkflowRegistry();
    const loadedCount = await registry.loadExternalWorkflows("C:/A/ComfyUI_windows_portable/ComfyUI/user/default/workflows");
    expect(typeof loadedCount).toBe("number");
  });
});
