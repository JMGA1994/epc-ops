import { z } from "zod";
import { CompanyStatus } from "@prisma/client";

export const createCompanySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  country: z.string().min(1, "El país es obligatorio"),
  status: z.nativeEnum(CompanyStatus).optional().default("PENDIENTE"),
  website: z.string().url("URL no válida").optional().or(z.literal("")),
  notes: z.string().optional(),
  nda_signed: z.boolean().optional().default(false),
  nda_signed_date: z.string().optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
