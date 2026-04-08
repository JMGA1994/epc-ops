import { z } from "zod";
import { Currency, ProposalModel, ProposalStatus } from "@prisma/client";

export const createProposalSchema = z.object({
  deal_id: z.string().min(1),
  model: z.nativeEnum(ProposalModel),
  amount: z.number().positive("El importe debe ser positivo"),
  currency: z.nativeEnum(Currency),
  scope: z.string().min(10, "Describe el alcance (mínimo 10 caracteres)"),
});

export const updateProposalSchema = z.object({
  model: z.nativeEnum(ProposalModel).optional(),
  amount: z.number().positive().optional(),
  currency: z.nativeEnum(Currency).optional(),
  scope: z.string().min(10).optional(),
  status: z.nativeEnum(ProposalStatus).optional(),
  rejected_reason: z.string().optional(),
  sent_date: z.string().optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>;
