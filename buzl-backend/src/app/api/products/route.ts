import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

type IncomingProduct = {
  product_name?: string;
  Name?: string;
  category?: string;
  Category?: string;
  drive_folder?: string;
  "View Link"?: string;
  Path?: string;
  reference_link?: string;
  "Reference Link"?: string;
  thumbnail_url?: string | null;
  reference_thumbnail_url?: string | null;
  last_action?: string;
};

const isDestructiveProductImportAllowed = () =>
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DESTRUCTIVE_PRODUCT_IMPORT === "true";

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

// GET all products
export async function GET(req: NextRequest) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  try {
    const lite = req.nextUrl.searchParams.get("lite") === "1";
    if (lite) {
      const products = await prisma.product.findMany({
        select: {
          id: true,
          product_name: true,
          category: true,
          drive_folder: true,
          reference_link: true,
          thumbnail_url: true,
          reference_thumbnail_url: true,
          status: true,
          current_phase: true,
          regen_image_count: true,
          generated_image_count: true,
          full_regen_image_count: true,
          notes: true,
          assigned_to: true,
          assignedAt: true,
          lastActivityAt: true,
          last_action: true,
          createdAt: true,
          updatedAt: true,
          assignee: { select: { id: true, username: true } },
          actionLogs: {
            take: 12,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              action: true,
              createdAt: true,
              user: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }],
      });
      return jsonWithCors(req, products);
    }

    // Both admin and workers get ALL products with assignee info
    const products = await prisma.product.findMany({
      include: {
        assignee: { select: { id: true, username: true } },
        actionLogs: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { id: true, username: true } } },
        },
      },
      orderBy: [{ lastActivityAt: "desc" }, { updatedAt: "desc" }],
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
        category: (p.category || p.Category || "").trim() || null,
        drive_folder: (p.drive_folder || p["View Link"] || p.Path || "").trim(),
        reference_link: (p.reference_link || p["Reference Link"] || "").trim() || null,
        thumbnail_url: p.thumbnail_url || null,
        reference_thumbnail_url: p.reference_thumbnail_url || null,
        status: "pending",
        current_phase: "none",
        regen_image_count: 0,
        generated_image_count: 0,
        full_regen_image_count: 0,
        last_action: p.last_action || "Imported from CSV",
        lastActivityAt: new Date(),
      }))
      .filter((p) => p.product_name && p.drive_folder);

    if (data.length === 0) {
      return jsonWithCors(req, { error: "No valid products to import" }, { status: 400 });
    }

    if (replace) {
      if (!isDestructiveProductImportAllowed()) {
        return jsonWithCors(req, { error: "Replace import is disabled in production" }, { status: 403 });
      }
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
    if (!isDestructiveProductImportAllowed()) {
      return jsonWithCors(req, { error: "Clear all products is disabled in production" }, { status: 403 });
    }
    await prisma.product.deleteMany({});
    return jsonWithCors(req, { success: true });
  } catch {
    return jsonWithCors(req, { error: "Clear failed" }, { status: 500 });
  }
}
