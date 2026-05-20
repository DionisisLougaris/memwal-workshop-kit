"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="secondary"
      onClick={() =>
        startTransition(() => {
          router.refresh();
        })
      }
      disabled={pending}
    >
      {pending ? "refreshing…" : "refresh from chain"}
    </button>
  );
}
