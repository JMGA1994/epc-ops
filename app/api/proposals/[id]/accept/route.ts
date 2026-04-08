import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { deal: true },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status !== "ENVIADO") {
    return NextResponse.json(
      { error: "Only sent proposals can be accepted" },
      { status: 422 }
    );
  }

  // Transaction: accept this proposal, mark others as not current, advance deal to GANADO
  await prisma.$transaction([
    // Mark all other proposals for this deal as not current
    prisma.proposal.updateMany({
      where: { deal_id: proposal.deal_id, id: { not: params.id } },
      data: { is_current: false },
    }),
    // Accept this proposal
    prisma.proposal.update({
      where: { id: params.id },
      data: {
        status: "ACEPTADO",
        is_current: true,
        accepted_date: new Date(),
      },
    }),
    // Advance deal to GANADO
    prisma.deal.update({
      where: { id: proposal.deal_id },
      data: { status: "GANADO" },
    }),
  ]);

  return NextResponse.json({ data: { success: true } });
}
