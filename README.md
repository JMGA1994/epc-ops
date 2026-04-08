# EPC-OPS

Aplicación web interna para gestionar una empresa de servicios técnicos a EPCs FV/BESS.

**Servicios**: BID Support · Ingeniería EPC · Staff Augmentation

---

## Stack

- **Frontend + Backend**: Next.js 14 (App Router) + TypeScript
- **Base de datos**: PostgreSQL via Supabase
- **ORM**: Prisma
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: NextAuth.js
- **Storage**: Supabase Storage (NDAs, propuestas, facturas)
- **Deploy**: Vercel

---

## Arranque rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### 3. Crear base de datos

```bash
# Generar Prisma client
npm run db:generate

# Ejecutar migraciones (primera vez)
npm run db:migrate

# (Opcional) Cargar datos de ejemplo
npm run db:seed
```

### 4. Arrancar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Estructura del proyecto

```
epc-ops/
├── app/
│   ├── (auth)/login/          → Login
│   ├── (app)/
│   │   ├── dashboard/         → Vista operativa del día
│   │   ├── crm/companies/     → Gestión de empresas
│   │   ├── deals/             → Pipeline kanban
│   │   ├── projects/          → Proyectos activos
│   │   ├── resources/         → Equipo y recursos
│   │   ├── invoices/          → Facturación
│   │   └── settings/          → Tipos de cambio, usuarios
│   └── api/                   → REST API endpoints
├── components/                → Componentes React
├── lib/
│   ├── prisma.ts              → Singleton PrismaClient
│   ├── queries/               → Queries complejas (dashboard, KPIs)
│   ├── validations/           → Schemas Zod
│   └── utils/                 → Helpers (currency, dates, cn)
└── prisma/
    ├── schema.prisma          → Modelo de datos completo
    └── seed.ts                → Datos de ejemplo
```

---

## Flujo de negocio

```
Company → Interaction → Deal → Proposal (versiones)
                                    ↓ [aceptada]
                               Project → TimeEntry → Invoice
                                      → Milestone  → Invoice
```

---

## MVP — Fases

| Fase | Duración | Entregable |
|------|----------|------------|
| 0 — Setup | 1 semana | App desplegada, auth, DB |
| 1 — CRM + Pipeline | 3 semanas | Gestión comercial completa |
| 2 — Proyectos + Horas | 3 semanas | Control operativo |
| 3 — Facturación + KPIs | 2 semanas | Ciclo económico cerrado |

---

## Trazabilidad obligatoria

```
Deal (GANADO) + Proposal (ACEPTADO) → Project → Invoice
```

No se puede crear un Project sin un Deal ganado y una Proposal aceptada.
