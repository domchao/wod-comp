"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDisplayName, uploadProfilePicture } from "./actions";
import { Avatar } from "@/app/_components/Avatar";

export function ProfileForm({
  currentName,
  currentAvatarUrl,
}: {
  currentName: string;
  currentAvatarUrl: string | null;
}) {
  const router = useRouter();

  const [nameValue, setNameValue] = useState(currentName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [isNamePending, startNameTransition] = useTransition();

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);
  const [isAvatarPending, startAvatarTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setAvatarError(null);
      setAvatarSuccess(false);
    }
  }

  function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setNameError(null);
    setNameSuccess(false);
    startNameTransition(async () => {
      const result = await updateDisplayName(null, formData);
      if (result && "error" in result) {
        setNameError(result.error ?? null);
      } else {
        const newName = (formData.get("name") as string)?.trim();
        if (newName) setNameValue(newName);
        setNameSuccess(true);
        router.refresh();
      }
    });
  }

  function handleAvatarSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setAvatarError(null);
    setAvatarSuccess(false);
    startAvatarTransition(async () => {
      const result = await uploadProfilePicture(null, formData);
      if (result && "error" in result) {
        setAvatarError(result.error ?? null);
      } else {
        setAvatarSuccess(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAvatarSubmit} className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">Profile picture</label>
          <div className="flex items-center gap-4">
            <Avatar src={previewUrl} name={nameValue} size="lg" />
            <div className="space-y-1">
              <input
                name="avatar"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
              />
              <p className="text-xs text-zinc-400">JPG, PNG or GIF · max 5 MB</p>
            </div>
          </div>
        </div>

        {avatarError && <p className="text-sm text-red-600">{avatarError}</p>}
        {avatarSuccess && <p className="text-sm text-green-600">Profile picture updated.</p>}

        <button
          type="submit"
          disabled={isAvatarPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isAvatarPending ? "Uploading..." : "Upload picture"}
        </button>
      </form>

      <form onSubmit={handleNameSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={50}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400">
            Shown on the leaderboard, comments, and members list.
          </p>
        </div>

        {nameError && <p className="text-sm text-red-600">{nameError}</p>}
        {nameSuccess && <p className="text-sm text-green-600">Display name updated.</p>}

        <button
          type="submit"
          disabled={isNamePending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isNamePending ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
