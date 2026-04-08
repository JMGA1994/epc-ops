import { PrismaClient, Currency } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Exchange rates
  await prisma.exchangeRate.createMany({
    data: [
      { currency: "EUR", date: new Date("2024-01-01"), rate_vs_usd: 0.92 },
      { currency: "MXN", date: new Date("2024-01-01"), rate_vs_usd: 17.15 },
      { currency: "EUR", date: new Date("2024-06-01"), rate_vs_usd: 0.93 },
      { currency: "MXN", date: new Date("2024-06-01"), rate_vs_usd: 17.80 },
    ],
    skipDuplicates: true,
  });

  // Demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@epc-ops.com" },
    update: {},
    create: { email: "demo@epc-ops.com", name: "Demo User", role: "admin" },
  });

  // Sample company
  const company = await prisma.company.create({
    data: {
      name: "SolarTech España S.L.",
      country: "España",
      status: "ACTIVA",
      website: "https://solartech.es",
    },
  });

  // Sample contact
  await prisma.contact.create({
    data: {
      company_id: company.id,
      name: "Carlos Ruiz",
      role: "DECISOR",
      email: "carlos.ruiz@solartech.es",
    },
  });

  // Sample deal
  const deal = await prisma.deal.create({
    data: {
      company_id: company.id,
      service: "BID",
      need: "Necesitan apoyo técnico para presentar oferta en licitación de 50 MW FV en Extremadura.",
      status: "PROPUESTA",
      probability: 60,
      expected_close: new Date("2024-09-30"),
      next_step: "Enviar propuesta técnica v2",
      next_step_date: new Date("2024-07-15"),
    },
  });

  // Sample proposal
  await prisma.proposal.create({
    data: {
      deal_id: deal.id,
      version: 1,
      model: "HORAS",
      amount: 45000,
      currency: "EUR",
      exchange_rate: 0.93,
      amount_usd: 45000 / 0.93,
      scope: "Soporte técnico para elaboración de propuesta EPC en licitación 50MW FV Extremadura. Incluye: memoria técnica, planos básicos, análisis de rendimiento y estimación CAPEX.",
      status: "ENVIADO",
      is_current: true,
      sent_date: new Date("2024-07-01"),
    },
  });

  console.log("Seed complete ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
