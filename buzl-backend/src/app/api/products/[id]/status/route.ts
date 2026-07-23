import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";
import { derivePhaseFromStatus } from "@/lib/productState";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { status } = await req.json();

    if (authUser.role !== "admin") {
      const product = await prisma.product.findUnique({ where: { id } });
      if (product?.assigned_to !== authUser.id) {
        return jsonWithCors(req, { error: "Forbidden" }, { status: 403 });
      }
    }

    const updated = await prisma.product.update({ 
      where: { id }, 
      data: { 
        status,
        current_phase: derivePhaseFromStatus(status),
        lastActivityAt: new Date(),
        last_action: `Status changed to ${status}`
      } 
    });
    return jsonWithCors(req, updated);
  } catch (err: any) {
    console.error("STATUS PATCH ERROR:", err);
    return jsonWithCors(req, { error: err?.message || "Update failed" }, { status: 500 });
  }
}
