"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/get-viewer";
import { parseWricefWorkbook } from "@/lib/import/wricef-xlsx";

export interface ImportState {
  error: string | null;
  imported: number | null;
}

const CHUNK_SIZE = 200;

/**
 * Bulk-inserts every row from the sheet as a new object row. Re-running an
 * import adds another batch rather than matching/updating existing rows —
 * wricef_id is intentionally non-unique (legitimately repeated for
 * multi-touchpoint interfaces), so there's no reliable natural key to
 * upsert against.
 */
export async function importObjectsFromXlsx(
  projectId: string,
  _prevState: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Not signed in.", imported: null };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an .xlsx file first.", imported: null };
  }

  let rows;
  try {
    const buffer = await file.arrayBuffer();
    rows = parseWricefWorkbook(buffer);
  } catch {
    return { error: "Couldn't read that file — is it a valid .xlsx?", imported: null };
  }

  if (rows.length === 0) {
    return { error: "No rows found on the Details sheet.", imported: null };
  }

  const supabase = await createClient();
  let imported = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE).map((row) => ({
      ...row,
      project_id: projectId,
      created_by: viewer.user.id,
      updated_by: viewer.user.id,
    }));
    const { error, count } = await supabase.from("objects").insert(chunk, { count: "exact" });
    if (error) return { error: error.message, imported: imported || null };
    imported += count ?? chunk.length;
  }

  revalidatePath(`/projects/${projectId}`);
  return { error: null, imported };
}
