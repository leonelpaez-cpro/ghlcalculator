import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name requerido" }, { status: 400 });
  }
  const created = await prisma.category.create({
    data: { name: name.trim(), description: description ?? null },
  });
  return NextResponse.json(created, { status: 201 });
}
