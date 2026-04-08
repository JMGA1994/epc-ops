import { z } from "zod";
import { Currency, InvoiceModel } from "@prisma/client";

export const createInvoiceSchema = z.object({
  project_id: z.string().min(1),
  milestone_id: z.string().optional(),
  model: z.nativeEnum(InvoiceModel),
  amount: z.number().positive(),
  currency: z.nativeEnum(Currency),
  issue_date: z.string().min(1),
  due_date: z.string().min(1),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1, "Añade al menos una línea de factura"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
