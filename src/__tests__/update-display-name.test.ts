import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { updateDisplayName } from "@/app/profile/actions";

vi.mock("@/lib/supabase/server");
vi.mock("next/cache");

const USER_ID = "user-1";

function buildSupabaseMock({ updateError = null as string | null } = {}) {
  const updateMock = vi.fn().mockResolvedValue({
    error: updateError ? { message: updateError } : null,
  });
  const eqMock = vi.fn().mockReturnValue({ error: null });
  // Chain: .from(...).update(...).eq(...)
  const fromMock = vi.fn().mockReturnValue({
    update: vi.fn().mockReturnValue({
      eq: updateError
        ? vi.fn().mockResolvedValue({ error: { message: updateError } })
        : vi.fn().mockResolvedValue({ error: null }),
    }),
  });
  void updateMock;
  void eqMock;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: fromMock,
  };
}

function makeFormData(name: string) {
  const fd = new FormData();
  fd.set("name", name);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
});

describe("updateDisplayName", () => {
  it("returns success and revalidates on a valid name", async () => {
    const result = await updateDisplayName(null, makeFormData("Alice"));
    expect(result).toEqual({ success: true });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/", "layout");
  });

  it("returns an error when the name is empty", async () => {
    const result = await updateDisplayName(null, makeFormData(""));
    expect(result).toEqual({ error: "Display name cannot be empty." });
  });

  it("returns an error when the name is only whitespace", async () => {
    const result = await updateDisplayName(null, makeFormData("   "));
    expect(result).toEqual({ error: "Display name cannot be empty." });
  });

  it("returns an error when the name exceeds 50 characters", async () => {
    const result = await updateDisplayName(null, makeFormData("a".repeat(51)));
    expect(result).toEqual({ error: "Display name must be 50 characters or fewer." });
  });

  it("accepts a name of exactly 50 characters", async () => {
    const result = await updateDisplayName(null, makeFormData("a".repeat(50)));
    expect(result).toEqual({ success: true });
  });

  it("returns the error message when the database update fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ updateError: "permission denied" }) as never
    );
    const result = await updateDisplayName(null, makeFormData("Alice"));
    expect(result).toEqual({ error: "permission denied" });
  });

  it("does not revalidate when validation fails", async () => {
    await updateDisplayName(null, makeFormData(""));
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });
});
