"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { deleteProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConfirming(true)}>
        <IconTrash size={14} />
        Delete project
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-xs" style={{ color: "var(--status-overdue)" }}>
          {error}
        </span>
      )}
      <span className="text-xs text-text-2">Delete &quot;{projectName}&quot; and everything in it?</span>
      <Button
        size="sm"
        disabled={isPending}
        style={{ background: "var(--status-overdue)", color: "white" }}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteProject(projectId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.push("/projects");
          })
        }
      >
        {isPending ? "Deleting…" : "Confirm delete"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={isPending}>
        Cancel
      </Button>
    </div>
  );
}
