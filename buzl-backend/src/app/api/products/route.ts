import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

type IncomingProduct = {
  product_name?: string;
  Name?: string;
  drive_folder?: string;
  "View Link"?: string;
  Path?: string;
  reference_link?: string;
  "Reference Link"?: string;
  thumbnail_url?: string | null;
  last_action?: string;
};

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

// GET all products
export async function GET(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  try {
    // Both admin and workers get ALL products with assignee info
    const products = await prisma.product.findMany({
      include: {
        assignee: { select: { id: true, username: true } },
        actionLogs: {
          orderBy: { createdAt: "desc" },
          take: 12,
          include: { user: { select: { id: true, username: true } } },
        },
      },
      orderBy: { product_name: "asc" },
    });
    return jsonWithCors(req, products);
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}

// POST - bulk create products (replaces all existing if replace=true)
export async function POST(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  try {
    const { products, replace } = await req.json();
    if (!Array.isArray(products)) {
      return jsonWithCors(req, { error: "Products must be an array" }, { status: 400 });
    }

    const data = products
      .map((p: IncomingProduct) => ({
        product_name: (p.product_name || p.Name || "").trim(),
        drive_folder: (p.drive_folder || p["View Link"] || p.Path || "").trim(),
        reference_link: (p.reference_link || p["Reference Link"] || "").trim() || null,
        thumbnail_url: p.thumbnail_url || null,
        status: "pending",
        last_action: p.last_action || "Imported from CSV",
      }))
      .filter((p) => p.product_name && p.drive_folder);

    if (data.length === 0) {
      return jsonWithCors(req, { error: "No valid products to import" }, { status: 400 });
    }

    if (replace) {
      await prisma.product.deleteMany({});
    }
    await prisma.product.createMany({ data });
    return jsonWithCors(req, { success: true, count: data.length });
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}

// DELETE all products (admin only)
export async function DELETE(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser || authUser.role !== "admin") return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.product.deleteMany({});
    return jsonWithCors(req, { success: true });
  } catch {
    return jsonWithCors(req, { error: "Clear failed" }, { status: 500 });
  }
}
