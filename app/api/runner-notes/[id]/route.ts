import { NextRequest, NextResponse } from "next/server";
import { updateRunnerNote, deleteRunnerNote } from "@/lib/db/database";
import type { RunnerNoteUpdate } from "@/types/runner-note";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// PUT /api/runner-notes/[id] - Update a runner note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const noteId = parseInt(id);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    const body = (await request.json()) as RunnerNoteUpdate;

    const note = await updateRunnerNote(noteId, body);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // 🔥 ON-DEMAND REVALIDATION
    revalidatePath("/participants");
    revalidatePath(`/runners/${note.runnerId}`);
    revalidatePath("/api/runners");

    return NextResponse.json(note);
  } catch (error) {
    console.error("Update runner note error:", error);
    return NextResponse.json(
      { error: "Failed to update runner note", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/runner-notes/[id] - Delete a runner note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const noteId = parseInt(id);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    const success = await deleteRunnerNote(noteId);

    if (!success) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // 🔥 ON-DEMAND REVALIDATION
    revalidatePath("/participants");
    revalidatePath("/api/runners");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete runner note error:", error);
    return NextResponse.json(
      { error: "Failed to delete runner note", details: String(error) },
      { status: 500 }
    );
  }
}
