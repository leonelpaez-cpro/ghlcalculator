import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { name, description } = await req.json();
  const updated = await prisma.category.update({
    where: { id: params.id },
    data: {
      name: name?.trim() || undefined,
      description: description === undefined ? undefined : description,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  // opcional: impedir borrar si hay servicios asociados
  const count = await prisma.service.count({ where: { categoryId: params.id } });
  if (count > 0) {
    return NextResponse.json({ error: "La categoría tiene servicios asociados." }, { status: 409 });
  }
  await prisma.category.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}
