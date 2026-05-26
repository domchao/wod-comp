import { vi, describe, it, expect, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { uploadProfilePicture } from "@/app/profile/actions";

vi.mock("@/lib/supabase/server");
vi.mock("next/cache");

const USER_ID = "user-1";
const PUBLIC_URL = "https://cdn.example.com/profile-pictures/user-1/uuid.jpg";

function buildStorageMock(uploadError: string | null = null) {
  return {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        error: uploadError ? { message: uploadError } : null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: PUBLIC_URL } }),
      remove: vi.fn().mockResolvedValue({}),
    }),
  };
}

function buildSupabaseMock({
  uploadError = null as string | null,
  updateError = null as string | null,
  existingAvatarUrl = null as string | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { avatar_url: existingAvatarUrl },
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: updateError ? { message: updateError } : null,
            }),
          }),
        };
      }
      return {};
    }),
    storage: buildStorageMock(uploadError),
  };
}

function makeFormData(file: File | null = null) {
  const fd = new FormData();
  if (file) fd.set("avatar", file);
  return fd;
}

function makeFile(size = 100) {
  return new File(["x".repeat(size)], "photo.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(buildSupabaseMock() as never);
});

describe("uploadProfilePicture", () => {
  it("returns success and revalidates when upload succeeds", async () => {
    const result = await uploadProfilePicture(null, makeFormData(makeFile()));
    expect(result).toEqual({ success: true, avatarUrl: PUBLIC_URL });
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/", "layout");
  });

  it("returns an error when no file is provided", async () => {
    const result = await uploadProfilePicture(null, makeFormData(null));
    expect(result).toEqual({ error: "No file selected." });
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns an error when the file has zero size", async () => {
    const result = await uploadProfilePicture(null, makeFormData(makeFile(0)));
    expect(result).toEqual({ error: "No file selected." });
  });

  it("returns an error when the file exceeds 5 MB", async () => {
    const result = await uploadProfilePicture(null, makeFormData(makeFile(5 * 1024 * 1024 + 1)));
    expect(result).toEqual({ error: "Image must be under 5 MB." });
  });

  it("accepts a file of exactly 5 MB", async () => {
    const result = await uploadProfilePicture(null, makeFormData(makeFile(5 * 1024 * 1024)));
    expect(result).toEqual({ success: true, avatarUrl: PUBLIC_URL });
  });

  it("returns an error when storage upload fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ uploadError: "Storage quota exceeded" }) as never
    );
    const result = await uploadProfilePicture(null, makeFormData(makeFile()));
    expect(result).toEqual({ error: "Upload failed: Storage quota exceeded" });
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("returns an error when the profile update fails", async () => {
    vi.mocked(createClient).mockResolvedValue(
      buildSupabaseMock({ updateError: "permission denied" }) as never
    );
    const result = await uploadProfilePicture(null, makeFormData(makeFile()));
    expect(result).toEqual({ error: "permission denied" });
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("removes the old avatar when one already exists", async () => {
    const mock = buildSupabaseMock({
      existingAvatarUrl:
        "https://cdn.example.com/storage/v1/object/public/profile-pictures/user-1/old.jpg",
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await uploadProfilePicture(null, makeFormData(makeFile()));

    const storageMock = mock.storage.from();
    expect(storageMock.remove).toHaveBeenCalledWith(["user-1/old.jpg"]);
  });

  it("does not call remove when there is no existing avatar", async () => {
    const mock = buildSupabaseMock({ existingAvatarUrl: null });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    await uploadProfilePicture(null, makeFormData(makeFile()));

    const storageMock = mock.storage.from();
    expect(storageMock.remove).not.toHaveBeenCalled();
  });
});
