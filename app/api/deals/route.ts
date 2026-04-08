import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDealSchema } from "@/lib/validations/deal";
import { DealStatus, ServiceType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as DealStatus | null;
  const service = searchParams.get("service") as ServiceType | null;
  const company_id = searchParams.get("company_id");

  const deals = await prisma.deal.findMany({
    where: {
      deleted_at: null,
      ...(status && { status }),
      ...(service && { service }),
      ...(company_id && { company_id }),
    },
    include: {
      company: { select: { id: true, name: true, country: true } },
      proposals: {
        where: { is_current: true },
        select: { id: true, amount: true, currency: true, status: true },
      },
      _count: { select: { proposals: true } },
    },
    orderBy: { updated_at: "desc" },
  });

  return NextResponse.json({ data: deals });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createDealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Verify company exists
  const company = await prisma.company.findFirst({
    where: { id: parsed.data.company_id, deleted_at: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const [deal] = await prisma.$transaction([
    prisma.deal.create({ data: parsed.data }),
    // Auto-advance company to ACTIVA if not already
    prisma.company.update({
      where: { id: parsed.data.company_id },
      data: {
        status:
          company.status === "PENDIENTE" ||
          company.status === "CONTACTADO" ||
          company.status === "RESPONDIO" ||
          company.status === "REUNION"
            ? "ACTIVA"
            : company.status,
      },
    }),
  ]);

  return NextResponse.json({ data: deal }, { status: 201 });
}
