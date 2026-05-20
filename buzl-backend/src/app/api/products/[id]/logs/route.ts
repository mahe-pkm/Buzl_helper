import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromRequest } from "@/lib/auth";
import { corsPreflight, jsonWithCors } from "@/lib/cors";

const TIMER_ACTION_ORDER = [
  "generation_start",
  "generation_complete",
  "qc_correction_start",
  "finish",
] as const;
const REGEN_ACTION = "regeneration";

const TIMER_ACTIONS = new Set<string>([...TIMER_ACTION_ORDER, REGEN_ACTION]);

const ACTION_LABELS: Record<string, string> = {
  generation_start: "Generation started",
  generation_complete: "Generation completed",
  qc_correction_start: "QC and correction started",
  finish: "Task finished",
  regeneration: "Regeneration requested",
};

const STATUS_BY_ACTION: Record<string, string | undefined> = {
  generation_start: "in-progress",
  generation_complete: "in-progress",
  qc_correction_start: "in-progress",
  finish: "completed",
};

const productInclude = {
  assignee: { select: { id: true, username: true } },
  actionLogs: {
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: { id: true, username: true } } },
  },
};

type ActionLogLite = {
  id: string;
  action: string;
  createdAt: Date;
};

function getCascadeActionsFrom(action: string) {
  const idx = TIMER_ACTION_ORDER.indexOf(action as (typeof TIMER_ACTION_ORDER)[number]);
  if (idx < 0) return [action];
  return TIMER_ACTION_ORDER.slice(idx);
}

function deriveProductStateFromLogs(logs: ActionLogLite[]) {
  const hasFinish = logs.some((log) => log.action === "finish");
  const hasStartedFlow = logs.some((log) =>
    log.action === "generation_start" ||
    log.action === "generation_complete" ||
    log.action === "qc_correction_start"
  );

  const status = hasFinish ? "completed" : hasStartedFlow ? "in-progress" : "pending";

  const latestLog = [...logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const last_action = latestLog ? ACTION_LABELS[latestLog.action] || null : null;

  return { status, last_action };
}

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: { assigned_to: true },
    });
    if (!product) return jsonWithCors(req, { error: "Not found" }, { status: 404 });

    if (authUser.role !== "admin" && product.assigned_to !== authUser.id) {
      return jsonWithCors(req, { error: "Forbidden" }, { status: 403 });
    }

    const logs = await prisma.productActionLog.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, username: true } } },
    });

    return jsonWithCors(req, logs);
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const { action } = (await req.json()) as { action?: string };
    if (!action || !TIMER_ACTIONS.has(action)) {
      return jsonWithCors(req, { error: "Invalid timer action" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { assigned_to: true },
    });
    if (!product) return jsonWithCors(req, { error: "Not found" }, { status: 404 });

    if (authUser.role !== "admin" && product.assigned_to !== authUser.id) {
      return jsonWithCors(req, { error: "Claim this task before logging time" }, { status: 403 });
    }

    const existingLogs = await prisma.productActionLog.findMany({
      where: { productId: id },
      select: { action: true },
    });
    const loggedActions = new Set(existingLogs.map((log) => log.action));
    if (action !== REGEN_ACTION && loggedActions.has(action)) {
      return jsonWithCors(req, { error: "This timer step is already logged" }, { status: 409 });
    }

    if (action !== REGEN_ACTION) {
      const actionIndex = TIMER_ACTION_ORDER.indexOf(action as (typeof TIMER_ACTION_ORDER)[number]);
      const missingPreviousAction = TIMER_ACTION_ORDER
        .slice(0, actionIndex)
        .find((previousAction) => !loggedActions.has(previousAction));
      if (missingPreviousAction) {
        return jsonWithCors(req, { error: "Complete the previous timer step first" }, { status: 409 });
      }
    }

    const nextStatus = STATUS_BY_ACTION[action];
    const productUpdateData =
      typeof nextStatus === "string"
        ? { status: nextStatus, last_action: ACTION_LABELS[action] }
        : { last_action: ACTION_LABELS[action] };

    await prisma.$transaction([
      prisma.productActionLog.create({
        data: {
          productId: id,
          userId: authUser.id,
          action,
        },
      }),
      prisma.product.update({
        where: { id },
        data: productUpdateData,
      }),
    ]);

    const updated = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    return jsonWithCors(req, updated);
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const { action } = (await req.json()) as { action?: string };
    if (!action || !TIMER_ACTIONS.has(action)) {
      return jsonWithCors(req, { error: "Invalid timer action" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { assigned_to: true },
    });
    if (!product) return jsonWithCors(req, { error: "Not found" }, { status: 404 });

    if (authUser.role !== "admin" && product.assigned_to !== authUser.id) {
      return jsonWithCors(req, { error: "Claim this task before editing timers" }, { status: 403 });
    }

    const existingLogs = await prisma.productActionLog.findMany({
      where: { productId: id },
      select: { id: true, action: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    let logsToDelete: ActionLogLite[] = [];

    if (action === REGEN_ACTION) {
      const latestRegen = existingLogs.find((log) => log.action === REGEN_ACTION);
      if (latestRegen) logsToDelete = [latestRegen];
    } else {
      const cascadeActions = new Set(getCascadeActionsFrom(action));
      logsToDelete = existingLogs.filter((log) => cascadeActions.has(log.action as (typeof TIMER_ACTION_ORDER)[number]));
    }

    if (logsToDelete.length === 0) {
      return jsonWithCors(req, { error: "Timer step not logged yet" }, { status: 404 });
    }

    const deleteIds = new Set(logsToDelete.map((log) => log.id));
    const remainingLogs = existingLogs.filter((log) => !deleteIds.has(log.id));
    const nextState = deriveProductStateFromLogs(remainingLogs);

    await prisma.$transaction([
      prisma.productActionLog.deleteMany({
        where: {
          id: { in: Array.from(deleteIds) },
        },
      }),
      prisma.product.update({
        where: { id },
        data: nextState,
      }),
    ]);

    const updated = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    return jsonWithCors(req, updated);
  } catch {
    return jsonWithCors(req, { error: "Internal server error" }, { status: 500 });
  }
}
