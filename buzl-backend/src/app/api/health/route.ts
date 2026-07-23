import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const productCount = await prisma.product.count();
    const dbUrl = process.env.DATABASE_URL || "";
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
    return NextResponse.json({
      status: "connected",
      database: maskedUrl,
      productCount,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const dbUrl = process.env.DATABASE_URL || "";
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ":****@");
    return NextResponse.json(
      {
        status: "error",
        database: maskedUrl,
        error: msg,
      },
      { status: 500 }
    );
  }
}
