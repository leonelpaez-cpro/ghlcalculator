import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, description } = await req.json();
  const updated = await prisma.category.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      description: description === undefined ? undefined : description,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // opcional: impedir borrar si hay servicios asociados
    const count = await prisma.service.count({ where: { categoryId: id } });
    if (count > 0) {
      return NextResponse.json({ error: "La categoría tiene servicios asociados." }, { status: 409 });
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar la categoría" }, { status: 500 });
  }
}
