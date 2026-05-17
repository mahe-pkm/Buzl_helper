import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";

// GET all products
export async function GET(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // Both admin and workers get ALL products with assignee info
    const products = await prisma.product.findMany({
      include: { assignee: { select: { id: true, username: true } } },
      orderBy: { product_name: "asc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - bulk create products (replaces all existing if replace=true)
export async function POST(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { products, replace } = await req.json();
    if (replace) {
      await prisma.product.deleteMany({});
    }
    await prisma.product.createMany({
      data: products.map((p: any) => ({
        product_name: (p.product_name || p.Name || "").trim(),
        drive_folder: (p.drive_folder || p["View Link"] || p.Path || "").trim(),
        reference_link: (p.reference_link || p["Reference Link"] || "").trim() || null,
        thumbnail_url: p.thumbnail_url || null,
        status: "pending",
        last_action: p.last_action || "Imported from CSV"
      })),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE all products (admin only)
export async function DELETE(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.product.deleteMany({});
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
}
