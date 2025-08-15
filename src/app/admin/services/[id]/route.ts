import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

function toDollar(s: any) {
  return {
    ...s,
    setupPrice: s.setupPrice / 100,
    monthlyPrice: s.monthlyPrice != null ? s.monthlyPrice / 100 : null,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, description, categoryId, setupPrice, monthlyPrice, isActive } = await req.json();

  const updated = await prisma.service.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      description: description === undefined ? undefined : description,
      categoryId: categoryId === undefined ? undefined : categoryId || null,
      setupPrice: setupPrice == null ? undefined : Math.round(Number(setupPrice) * 100),
      monthlyPrice: monthlyPrice === undefined ? undefined : (monthlyPrice != null ? Math.round(Number(monthlyPrice) * 100) : null),
      isActive: typeof isActive === "boolean" ? isActive : undefined,
    },
    include: { category: true },
  });

  return NextResponse.json(toDollar(updated));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // opcional: impedir borrar si está usado en algún plan
    const count = await prisma.planService.count({ where: { serviceId: id } });
    if (count > 0) {
      return NextResponse.json({ error: "El servicio está en uso por algún plan." }, { status: 409 });
    }
    await prisma.service.delete({ where: { id } });
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar el servicio" }, { status: 500 });
  }
}
