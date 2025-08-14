// src/app/api/plans/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Normaliza un plan (y sus servicios) a dólares para el frontend
 */
function toDollars(plan: any) {
  if (!plan) return plan;
  return {
    ...plan,
    baseMonthly: plan.baseMonthly != null ? plan.baseMonthly / 100 : null,
    services: (plan.services ?? []).map((ps: any) => ({
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
  };
}

/**
 * GET /api/plans/:id
 * Devuelve el plan con sus módulos (PlanService + Service)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const plan = await prisma.plan.findUnique({
    where: { id: params.id },
    include: { services: { include: { service: true } } },
  });
  if (!plan) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }
  return NextResponse.json(toDollars(plan));
}

/**
 * PATCH /api/plans/:id
 * Body opcional:
 *  - name?: string                  -> renombrar
 *  - serviceIds?: string[]          -> reemplazar módulos del plan por estos services
 *
 * Recalcula baseMonthly como suma de monthlyPrice de los services (en centavos).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const body = await req.json().catch(() => ({})) as {
    name?: string;
    serviceIds?: string[];
  };

  // Validaciones básicas
  if (body.serviceIds && (!Array.isArray(body.serviceIds) || body.serviceIds.length === 0)) {
    return NextResponse.json(
      { error: "serviceIds debe ser un arreglo no vacío" },
      { status: 400 }
    );
  }

  // Verifica que exista el plan
  const exists = await prisma.plan.findUnique({ where: { id } });
  if (!exists) {
    return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
  }

  // Si NO hay cambios de módulos, sólo renombramos (si viene name)
  if (!body.serviceIds) {
    if (!body.name || !body.name.trim()) {
      // Nada que actualizar
      const current = await prisma.plan.findUnique({
        where: { id },
        include: { services: { include: { service: true } } },
      });
      return NextResponse.json(toDollars(current));
    }

    const updated = await prisma.plan.update({
      where: { id },
      data: { name: body.name.trim() },
      include: { services: { include: { service: true } } },
    });
    return NextResponse.json(toDollars(updated));
  }

  // Si VIENEN nuevos serviceIds: reemplazamos módulos y recalculamos baseMonthly
  const services = await prisma.service.findMany({
    where: { id: { in: body.serviceIds } },
  });
  if (services.length !== body.serviceIds.length) {
    return NextResponse.json({ error: "Algunos services no existen" }, { status: 400 });
  }

  const baseMonthlyCents = services.reduce(
    (acc, s) => acc + (s.monthlyPrice ?? 0),
    0
  );

  // Transacción: borrar enlaces antiguos, actualizar plan (name opcional), crear nuevos enlaces
  const updated = await prisma.$transaction(async (tx) => {
    await tx.planService.deleteMany({ where: { planId: id } });

    const plan = await tx.plan.update({
      where: { id },
      data: {
        name: body.name?.trim() || undefined,
        baseMonthly: baseMonthlyCents,
      },
    });

    await tx.planService.createMany({
      data: services.map((s) => ({
        planId: plan.id,
        serviceId: s.id,
        // si quisieras overrides por plan, aquí podrías setear setupPrice/monthlyPrice
      })),
    });

    return tx.plan.findUnique({
      where: { id: plan.id },
      include: { services: { include: { service: true } } },
    });
  });

  return NextResponse.json(toDollars(updated));
}

/**
 * DELETE /api/plans/:id
 * Elimina el plan y sus relaciones con servicios
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Asegura limpieza de relaciones
  await prisma.$transaction([
    prisma.planService.deleteMany({ where: { planId: id } }),
    prisma.plan.delete({ where: { id } }),
  ]);

  return new NextResponse(null, { status: 204 });
}

