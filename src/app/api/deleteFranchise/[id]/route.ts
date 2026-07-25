import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db";
import { getCurrentUser, hasRole } from "@/server/auth";
import { Franchise } from "@/server/models";

/**
 * DELETE /api/deleteFranchise/:id
 * Ported from legacy franchiseRoutes.js. Legacy had no auth; locked to
 * admin/owner here since it permanently deletes a franchise partner account.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!hasRole(currentUser, ["admin", "owner"])) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    const { id } = await params;

    const franchise = await Franchise.findById(id);

    if (!franchise) {
      return NextResponse.json({ message: "Franchise not found" }, { status: 404 });
    }

    await Franchise.findByIdAndDelete(id);

    return NextResponse.json({ message: "Franchise deleted successfully" });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Failed to delete franchise" }, { status: 500 });
  }
}
