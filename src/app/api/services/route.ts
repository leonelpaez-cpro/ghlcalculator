import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** Convierte un valor a número (centavos) o null.
 *  Acepta string, number, null/undefined. "" -> null. "12.34" -> 1234
 */
function parseMoneyToCents(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string" && input.trim() === "") return null;
  const n = Number(input);
  if (Number.isNaN(n)) return null;
  // guardamos en centavos (Int)
  return Math.round(n * 100);
}

function toDollar(row: any) {
  return {
    ...row,
    setupPrice: row.setupPrice / 100,
    monthlyPrice: row.monthlyPrice != null ? row.monthlyPrice / 100 : null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";

  // En SQLite evitamos mode:"insensitive". Si quieres case-insensitive, puedes normalizar o usar una columna auxiliar.
  const where: any = {
    isActive: true,
    ...(categoryId ? { categoryId } : {}),
  };

  if (q.trim() !== "") {
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
  try {
    const body = await req.json();

    // ---- Soporte de clonado ----
    if (body?.cloneFromId) {
      const base = await prisma.service.findUnique({ where: { id: body.cloneFromId } });
      if (!base) {
        return NextResponse.json({ error: "Servicio a clonar no existe" }, { status: 404 });
      }
      const name: string = (body.name as string | undefined)?.trim() || `${base.name} (copia)`;
      const created = await prisma.service.create({
        data: {
          name,
          description: base.description,
          setupPrice: base.setupPrice,       // ya está en centavos
          monthlyPrice: base.monthlyPrice,   // ya está en centavos o null
          categoryId: base.categoryId ?? null,
        },
        include: { category: true },
      });
      return NextResponse.json(toDollar(created), { status: 201 });
    }

    // ---- Crear servicio nuevo ----
    const name: string | undefined = typeof body?.name === "string" ? body.name.trim() : undefined;
    const description: string | null =
      typeof body?.description === "string" && body.description.trim() !== ""
        ? body.description.trim()
        : null;
    const categoryId: string | null =
      typeof body?.categoryId === "string" && body.categoryId.trim() !== ""
        ? body.categoryId
        : null;

    const setupCents = parseMoneyToCents(body?.setupPrice);
    const monthlyCents = parseMoneyToCents(body?.monthlyPrice);

    if (!name || setupCents === null) {
      return NextResponse.json(
        { error: "name y setupPrice son requeridos (setupPrice debe ser numérico)" },
        { status: 400 }
      );
    }

    const created = await prisma.service.create({
      data: {
        name,
        description,
        categoryId,
        setupPrice: setupCents,
        monthlyPrice: monthlyCents,
      },
      include: { category: true },
    });

    return NextResponse.json(toDollar(created), { status: 201 });
  } catch (e: any) {
    console.error("POST /api/services error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Error creando servicio" },
      { status: 500 }
    );
  }
}
