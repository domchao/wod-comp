"use client";

import { useState } from "react";

export function InviteSection({ inviteCode, siteUrl }: { inviteCode: string; siteUrl: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/invite/${inviteCode}`;

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Invite link</p>
      <div className="flex items-center gap-2">
        <p className="font-mono text-lg font-semibold tracking-widest">
          {inviteCode.toUpperCase()}
        </p>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-50"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      <p className="text-xs text-zinc-400">Share this code or copy the invite link</p>
    </div>
  );
}
