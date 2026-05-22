import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";
import { derivePhaseFromStatus } from "@/lib/productState";

type ProductPatchBody = {
  status?: string;
  assigned_to?: string | null;
  notes?: string | null;
  category?: string | null;
  regen_image_count?: number;
  generated_image_count?: number;
  full_regen_image_count?: number;
  thumbnail_cached_data?: string | null;
  reference_thumbnail_cached_data?: string | null;
  reference_thumbnail_url?: string | null;
  thumbnail_url?: string | null;
};

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    return jsonWithCors(req, product);
  } catch {
    return jsonWithCors(req, { error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return jsonWithCors(req, { success: true });
  } catch {
    return jsonWithCors(req, { error: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = (await req.json()) as ProductPatchBody;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return jsonWithCors(req, { error: "Not found" }, { status: 404 });

    if (body.assigned_to !== undefined && authUser.role !== "admin") {
      return jsonWithCors(req, { error: "Only admins can assign products" }, { status: 403 });
    }

    if (authUser.role !== "admin" && product.assigned_to !== authUser.id) {
      return jsonWithCors(req, { error: "Forbidden" }, { status: 403 });
    }

    const data: ProductPatchBody & { last_action?: string; current_phase?: string; lastActivityAt?: Date; assignedAt?: Date | null } = {};
    if (body.status !== undefined) {
      data.status = body.status;
      data.current_phase = derivePhaseFromStatus(body.status);
      data.last_action = `Status changed to ${body.status}`;
      data.lastActivityAt = new Date();
    }
    if (body.assigned_to !== undefined) {
      data.assigned_to = body.assigned_to;
      data.assignedAt = body.assigned_to ? new Date() : null;
      data.last_action = body.assigned_to ? "Assigned" : "Unassigned";
      data.lastActivityAt = new Date();
    }
    if (body.notes !== undefined) {
      data.notes = body.notes;
      data.last_action = "Notes added/updated";
      data.lastActivityAt = new Date();
    }
    if (body.category !== undefined) {
      data.category = body.category || null;
      data.last_action = "Category updated";
      data.lastActivityAt = new Date();
    }
    if (typeof body.regen_image_count === "number") {
      data.regen_image_count = Math.max(0, Math.floor(body.regen_image_count));
      data.last_action = "Re-gen image count updated";
      data.lastActivityAt = new Date();
    }
    if (typeof body.generated_image_count === "number") {
      data.generated_image_count = Math.max(0, Math.floor(body.generated_image_count));
      data.last_action = "Generated image count updated";
      data.lastActivityAt = new Date();
    }
    if (typeof body.full_regen_image_count === "number") {
      data.full_regen_image_count = Math.max(0, Math.floor(body.full_regen_image_count));
      data.last_action = "Full re-gen image count updated";
      data.lastActivityAt = new Date();
    }
    if (body.thumbnail_cached_data !== undefined) {
      data.thumbnail_cached_data = body.thumbnail_cached_data || null;
    }
    if (body.reference_thumbnail_cached_data !== undefined) {
      data.reference_thumbnail_cached_data = body.reference_thumbnail_cached_data || null;
    }
    if (body.thumbnail_url !== undefined) {
      data.thumbnail_url = body.thumbnail_url || null;
    }
    if (body.reference_thumbnail_url !== undefined) {
      data.reference_thumbnail_url = body.reference_thumbnail_url || null;
    }

    const updated = await prisma.product.update({ where: { id }, data });
    return jsonWithCors(req, updated);
  } catch {
    return jsonWithCors(req, { error: "Update failed" }, { status: 500 });
  }
}
