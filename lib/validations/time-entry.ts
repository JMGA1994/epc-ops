import { z } from "zod";
import { TimeEntryType } from "@prisma/client";

export const createTimeEntrySchema = z.object({
  project_id: z.string().min(1),
  resource_id: z.string().min(1),
  date: z.string().min(1, "La fecha es obligatoria"),
  hours: z
    .number()
    .positive("Las horas deben ser positivas")
    .max(24, "No se pueden imputar más de 24 horas por día"),
  type: z.nativeEnum(TimeEntryType),
  description: z.string().optional(),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
