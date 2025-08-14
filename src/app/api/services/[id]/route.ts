import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function parseMoneyToCents(input: unknown): number | undefined {
  // undefined -> dejamos el valor sin tocar (útil para PATCH)
  if (input === undefined || input === null) return undefined;
  if (typeof input === "string" && input.trim() === "") return undefined;
  const n = Number(input);
  if (Number.isNaN(n)) return undefined;
  return Math.round(n * 100);
}

function toDollar(row: any) {
  return {
    ...row,
    setupPrice: row.setupPrice / 100,
    monthlyPrice: row.monthlyPrice != null ? row.monthlyPrice / 100 : null,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const name: string | undefined =
      typeof body?.name === "string" ? body.name.trim() : undefined;

    const description =
      body?.description === undefined
        ? undefined
        : (typeof body.description === "string"
            ? body.description.trim() || null
            : null);

    const categoryId =
      body?.categoryId === undefined
        ? undefined
        : (typeof body.categoryId === "string" && body.categoryId.trim() !== ""
            ? body.categoryId
            : null);

    const setupCents = parseMoneyToCents(body?.setupPrice);
    const monthlyCents = parseMoneyToCents(body?.monthlyPrice);

    const isActive =
      typeof body?.isActive === "boolean" ? body.isActive : undefined;

    const updated = await prisma.service.update({
      where: { id: params.id },
      data: {
        name,
        description,
        categoryId,
        setupPrice: setupCents,
        monthlyPrice: monthlyCents,
        isActive,
      },
      include: { category: true },
    });

    return NextResponse.json(toDollar(updated));
  } catch (e: any) {
    console.error(`PATCH /api/services/${params.id} error:`, e);
    return NextResponse.json(
      { error: e?.message ?? "Error actualizando servicio" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // opcional: impedir borrar si está en uso
    const count = await prisma.planService.count({ where: { serviceId: params.id } });
    if (count > 0) {
      return NextResponse.json(
        { error: "El servicio está en uso por algún plan." },
        { status: 409 }
      );
    }
    await prisma.service.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    console.error(`DELETE /api/services/${params.id} error:`, e);
    return NextResponse.json(
      { error: e?.message ?? "Error eliminando servicio" },
      { status: 500 }
    );
  }
}

