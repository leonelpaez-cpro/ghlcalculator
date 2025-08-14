// src/app/api/plans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * GET /api/plans  -> lista planes con sus servicios
 */
export async function GET() {
  const plans = await prisma.plan.findMany({
    include: { services: { include: { service: true } } },
    orderBy: { createdAt: "desc" },
  });

  // devolver montos en dólares para el frontend
  const out = plans.map((p) => ({
    ...p,
    baseMonthly: p.baseMonthly != null ? p.baseMonthly / 100 : null,
    services: p.services.map((ps) => ({
      ...ps,
      setupPrice: ps.setupPrice != null ? ps.setupPrice / 100 : null,
      monthlyPrice: ps.monthlyPrice != null ? ps.monthlyPrice / 100 : null,
      service: {
        ...ps.service,
        setupPrice: ps.service.setupPrice / 100,
        monthlyPrice:
          ps.service.monthlyPrice != null ? ps.service.monthlyPrice / 100 : null,
      },
    })),
  }));
  return NextResponse.json(out);
}

/**
 * POST /api/plans
 * - Crear plan nuevo: { name, serviceIds: string[] }
 * - Clonar plan: { cloneFromId, newName }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // -------- CLONAR PLAN --------
  if (body.cloneFromId) {
    const { cloneFromId, newName } = body as {
      cloneFromId: string;
      newName?: string;
    };

    const base = await prisma.plan.findUnique({
      where: { id: cloneFromId },
      include: { services: true },
    });
    if (!base) {
      return NextResponse.json({ error: "Plan a clonar no existe" }, { status: 404 });
    }

    const cloned = await prisma.plan.create({
      data: {
        name: newName || `${base.name} (copia)`,
        baseMonthly: base.baseMonthly,
        services: {
          create: base.services.map((ps) => ({
            serviceId: ps.serviceId,
            setupPrice: ps.setupPrice ?? undefined,
            monthlyPrice: ps.monthlyPrice ?? undefined,
          })),
        },
      },
      include: { services: { include: { service: true } } },
    });

    return NextResponse.json(
      {
        ...cloned,
        baseMonthly: cloned.baseMonthly != null ? cloned.baseMonthly / 100 : null,
        services: cloned.services.map((ps) => ({
          ...ps,
          setupPrice: ps.setupPrice != null ? ps.setupPrice / 100 : null,
          monthlyPrice: ps.monthlyPrice != null ? ps.monthlyPrice / 100 : null,
          service: {
            ...ps.service,
            setupPrice: ps.service.setupPrice / 100,
            monthlyPrice:
              ps.service.monthlyPrice != null ? ps.service.monthlyPrice / 100 : null,
          },
        })),
      },
      { status: 201 }
    );
  }

  // -------- CREAR PLAN --------
  const { name, serviceIds } = body as { name: string; serviceIds: string[] };

  if (!name || !Array.isArray(serviceIds) || serviceIds.length === 0) {
    return NextResponse.json(
      { error: "name y serviceIds[] son requeridos" },
      { status: 400 }
    );
  }

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
  });
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: "Algunos services no existen" }, { status: 400 });
  }

  const baseMonthlyCents = services.reduce(
    (acc, s) => acc + (s.monthlyPrice ?? 0),
    0
  );

  const plan = await prisma.plan.create({
    data: { name, baseMonthly: baseMonthlyCents },
    include: { services: true },
  });

  // vincular servicios
  await prisma.$transaction(
    services.map((s) =>
      prisma.planService.create({
        data: { planId: plan.id, serviceId: s.id },
      })
    )
  );

  const created = await prisma.plan.findUnique({
    where: { id: plan.id },
    include: { services: { include: { service: true } } },
  });

  return NextResponse.json(
    {
      ...created!,
      baseMonthly: created!.baseMonthly != null ? created!.baseMonthly / 100 : null,
      services: created!.services.map((ps) => ({
        ...ps,
        setupPrice: ps.setupPrice != null ? ps.setupPrice / 100 : null,
        monthlyPrice: ps.monthlyPrice != null ? ps.monthlyPrice / 100 : null,
        service: {
          ...ps.service,
          setupPrice: ps.service.setupPrice / 100,
          monthlyPrice:
            ps.service.monthlyPrice != null ? ps.service.monthlyPrice / 100 : null,
        },
      })),
    },
    { status: 201 }
  );
}


