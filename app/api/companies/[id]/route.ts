import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateCompanySchema } from "@/lib/validations/company";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const company = await prisma.company.findFirst({
    where: { id: params.id, deleted_at: null },
    include: {
      contacts: true,
      interactions: {
        orderBy: { date: "desc" },
        include: { user: { select: { name: true } } },
      },
      deals: {
        where: { deleted_at: null },
        include: { proposals: { where: { is_current: true } } },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ data: company });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = updateCompanySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ data: company });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.company.update({
    where: { id: params.id },
    data: { deleted_at: new Date() },
  });
  return NextResponse.json({ data: { success: true } });
}
