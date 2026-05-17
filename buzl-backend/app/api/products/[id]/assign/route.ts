import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const { assigned_to } = await req.json();
    const product = await prisma.product.update({
      where: { id },
      data: { 
        assigned_to: assigned_to ?? null,
        last_action: assigned_to ? 'Assigned to worker' : 'Unassigned'
      },
    });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
