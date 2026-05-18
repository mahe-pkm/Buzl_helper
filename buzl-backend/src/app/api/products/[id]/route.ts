import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

type ProductPatchBody = {
  status?: string;
  assigned_to?: string | null;
  notes?: string | null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = (await req.json()) as ProductPatchBody;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body.assigned_to !== undefined && authUser.role !== "admin") {
      return NextResponse.json({ error: "Only admins can assign products" }, { status: 403 });
    }

    if (authUser.role !== "admin" && product.assigned_to !== authUser.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: ProductPatchBody & { last_action?: string } = {};
    if (body.status !== undefined) {
      data.status = body.status;
      data.last_action = `Status changed to ${body.status}`;
    }
    if (body.assigned_to !== undefined) {
      data.assigned_to = body.assigned_to;
      data.last_action = body.assigned_to ? "Assigned" : "Unassigned";
    }
    if (body.notes !== undefined) {
      data.notes = body.notes;
      data.last_action = "Notes added/updated";
    }

    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
