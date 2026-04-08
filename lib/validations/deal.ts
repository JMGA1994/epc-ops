import { z } from "zod";
import { DealStatus, ServiceType } from "@prisma/client";

export const createDealSchema = z.object({
  company_id: z.string().min(1, "La empresa es obligatoria"),
  service: z.nativeEnum(ServiceType),
  need: z.string().min(10, "Describe la necesidad del cliente (mínimo 10 caracteres)"),
  probability: z.number().min(0).max(100).optional(),
  expected_close: z.string().optional(),
  next_step: z.string().optional(),
  next_step_date: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDealSchema = z.object({
  service: z.nativeEnum(ServiceType).optional(),
  need: z.string().min(10).optional(),
  status: z.nativeEnum(DealStatus).optional(),
  probability: z.number().min(0).max(100).optional(),
  expected_close: z.string().optional(),
  next_step: z.string().optional(),
  next_step_date: z.string().optional(),
  loss_reason: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.status === "PERDIDO" && !data.loss_reason) return false;
    return true;
  },
  { message: "El motivo de pérdida es obligatorio", path: ["loss_reason"] }
);

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
