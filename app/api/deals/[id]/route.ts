import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDealSchema } from "@/lib/validations/deal";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const deal = await prisma.deal.findFirst({
    where: { id: params.id, deleted_at: null },
    include: {
      company: true,
      proposals: { orderBy: { version: "desc" } },
      project: true,
    },
  });

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json({ data: deal });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const parsed = updateDealSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const deal = await prisma.deal.update({
    where: { id: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ data: deal });
}
