import { describe, it, expect, vi } from "vitest";

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockClient = { get: mockGet, post: mockPost };

vi.mock("axios", () => ({
  default: { create: vi.fn(() => mockClient) },
}));

import { createBitbucketProvider } from "../lib/providers/git/bitbucket.js";
import axios from "axios";

describe("createBitbucketProvider", () => {
  it("throws if token is missing", () => {
    expect(() => createBitbucketProvider({})).toThrow("token");
  });

  it("returns provider with expected methods", () => {
    const provider = createBitbucketProvider({ token: "t" });
    expect(typeof provider.generateBranchName).toBe("function");
    expect(typeof provider.findBranch).toBe("function");
    expect(typeof provider.createBranch).toBe("function");
    expect(typeof provider.createPR).toBe("function");
  });

  it("generates branch name from ticket key and summary", () => {
    const provider = createBitbucketProvider({ token: "t" });
    expect(provider.generateBranchName("PROJ-123", "Fix login bug")).toBe("PROJ-123-fix-login-bug");
  });

  it("uses Bearer auth by default", () => {
    createBitbucketProvider({ token: "mytoken" });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer mytoken" }),
      }),
    );
  });

  it("uses Basic auth when username is provided", () => {
    createBitbucketProvider({ token: "mytoken", username: "myuser" });
    const expectedAuth = `Basic ${Buffer.from("myuser:mytoken").toString("base64")}`;
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expectedAuth }),
      }),
    );
  });

  it("findBranch returns matching branch name", async () => {
    const provider = createBitbucketProvider({ token: "t" });
    mockGet.mockResolvedValueOnce({
      data: { values: [{ name: "PROJ-123-fix-bug" }] },
    });

    const result = await provider.findBranch({ repoPath: "workspace/repo" }, "PROJ-123");
    expect(result).toBe("PROJ-123-fix-bug");
  });

  it("findBranch returns null when no matching branch", async () => {
    const provider = createBitbucketProvider({ token: "t" });
    mockGet.mockResolvedValueOnce({
      data: { values: [] },
    });

    const result = await provider.findBranch({ repoPath: "workspace/repo" }, "PROJ-123");
    expect(result).toBe(null);
  });
});
