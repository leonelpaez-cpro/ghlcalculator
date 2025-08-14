import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const toDollar = (s: any) => ({
  ...s,
  setupPrice: s.setupPrice / 100,
  monthlyPrice: s.monthlyPrice != null ? s.monthlyPrice / 100 : null,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const categoryId = searchParams.get("categoryId");

  // Construimos el where paso a paso (evita problemas de tipos)
  const where: any = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
  };

  if (q && q.trim() !== "") {
    // En SQLite no uses `mode: "insensitive"`
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const rows = await prisma.service.findMany({
    where,
    include: { category: true },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(rows.map(toDollar));
}


export async function POST(req: NextRequest) {
  const body = await req.json();

  // Soportar clonado rápido
  if (body.cloneFromId) {
    const base = await prisma.service.findUnique({ where: { id: body.cloneFromId } });
    if (!base) return NextResponse.json({ error: "Servicio a clonar no existe" }, { status: 404 });

    const name = (body.name as string | undefined)?.trim() || `${base.name} (copia)`;
    const created = await prisma.service.create({
      data: {
        name,
        description: base.description,
        setupPrice: base.setupPrice,
        monthlyPrice: base.monthlyPrice,
        categoryId: base.categoryId,
      },
      include: { category: true },
    });
    return NextResponse.json(toDollar(created), { status: 201 });
  }

  // Crear servicio normal
  const { name, description, categoryId, setupPrice, monthlyPrice } = body;
  if (!name || setupPrice == null) {
    return NextResponse.json({ error: "name y setupPrice son requeridos" }, { status: 400 });
  }

  const created = await prisma.service.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      categoryId: categoryId ?? null,
      setupPrice: Math.round(Number(setupPrice) * 100),
      monthlyPrice: monthlyPrice != null ? Math.round(Number(monthlyPrice) * 100) : null,
    },
    include: { category: true },
  });

  return NextResponse.json(toDollar(created), { status: 201 });
}
