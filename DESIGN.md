# EPC-OPS — Diseño Técnico Completo
**Aplicación web interna para empresa de servicios técnicos FV/BESS**
*Versión 1.0 — MVP*

---

## 1. ARQUITECTURA

### Decisión de stack

Para una empresa de 3–10 personas que necesita velocidad de entrega, mantenibilidad y coste bajo, el stack óptimo es:

```
Frontend:  Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
Backend:   Next.js API Routes (mismo repo, monorepo)
Base de datos: PostgreSQL (Supabase hosted — gratis hasta 500MB, sin ops)
ORM:       Prisma (type-safe, migraciones automáticas)
Auth:      NextAuth.js (Google OAuth o email/password)
Storage:   Supabase Storage (NDAs, propuestas PDF)
Deploy:    Vercel (CI/CD automático, gratis para uso interno)
```

### Por qué este stack y no otro

| Alternativa considerada | Descartada porque |
|------------------------|-------------------|
| Django + React separado | Dos repos, más ops, más fricción |
| Rails | Menos talento disponible, ecosistema más reducido |
| Supabase full (sin Next.js) | Lógica de negocio en cliente = fragilidad |
| NestJS + React | Sobre-arquitectura para equipo de 3-10 |
| Airtable / Notion | Sin trazabilidad real, sin lógica de negocio |

### Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────┐
│                    NAVEGADOR                            │
│         Next.js App (React Server Components)           │
│    Dashboard │ CRM │ Deals │ Proyectos │ Facturación    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP / Server Actions
┌──────────────────────▼──────────────────────────────────┐
│              Next.js API Routes (/api/*)                │
│         Validación (Zod) + Lógica de negocio            │
│              Autenticación (NextAuth)                   │
└──────────────────────┬──────────────────────────────────┘
                       │ Prisma Client
┌──────────────────────▼──────────────────────────────────┐
│              PostgreSQL (Supabase)                      │
│    Tablas relacionales + Row Level Security             │
└─────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Supabase Storage                           │
│    Bucket: ndas/ | proposals/ | invoices/               │
└─────────────────────────────────────────────────────────┘
```

### Principios de arquitectura

- **Monorepo**: frontend y backend en el mismo proyecto Next.js. Sin microservicios. Sin colas. Sin lambdas.
- **Server-first**: React Server Components para lectura de datos (sin round-trips innecesarios al cliente).
- **Server Actions** para mutaciones: formularios que envían directamente al servidor sin necesidad de endpoints REST explícitos en las operaciones CRUD simples.
- **API Routes** para operaciones más complejas o que necesiten ser llamadas desde fuera.
- **Prisma** como única fuente de verdad del schema. Las migraciones son código versionado en Git.

---

## 2. MODELO DE DATOS

### Convenciones

- Todos los `id` son `cuid()` (legibles, no secuenciales — evitan enumeración)
- `created_at` y `updated_at` en todas las tablas
- `deleted_at` (soft delete) en entidades críticas (Companies, Deals, Projects)
- Los importes se guardan como `Decimal` con precisión de 2 decimales
- La moneda base para reporting es `USD`; cada transacción guarda su tipo de cambio histórico

### Schema Prisma completo

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

enum Currency {
  USD
  EUR
  MXN
}

enum CompanyStatus {
  PENDIENTE
  CONTACTADO
  RESPONDIO
  REUNION
  ACTIVA
  NO_INTERESA
  NO_ENCAJA
}

enum ContactRole {
  DECISOR
  TECNICO
  FINANCIERO
  OPERACIONES
  OTRO
}

enum InteractionType {
  EMAIL
  LLAMADA
  WHATSAPP
  REUNION
}

enum ServiceType {
  BID
  INGENIERIA_EPC
  STAFF_AUGMENTATION
}

enum DealStatus {
  OPORTUNIDAD
  ANALISIS
  PROPUESTA
  NEGOCIACION
  GANADO
  PERDIDO
}

enum ProposalModel {
  HORAS
  HITOS
  MIXTO
}

enum ProposalStatus {
  BORRADOR
  ENVIADO
  ACEPTADO
  RECHAZADO
}

enum ProjectStatus {
  PENDIENTE
  ACTIVO
  CERRADO
}

enum MilestoneStatus {
  PENDIENTE
  COMPLETADO
  FACTURADO
}

enum InvoiceModel {
  HORAS
  HITO
}

enum InvoiceStatus {
  EMITIDA
  COBRADA
  VENCIDA
}

enum ResourceType {
  INTERNO
  EXTERNO
}

enum TimeEntryType {
  FACTURABLE
  INTERNO
}

// ─────────────────────────────────────────
// MONEDA Y TIPOS DE CAMBIO
// ─────────────────────────────────────────

model ExchangeRate {
  id         String   @id @default(cuid())
  currency   Currency
  date       DateTime @db.Date
  rate_vs_usd Decimal @db.Decimal(12, 6)  // 1 USD = X moneda
  created_at DateTime @default(now())

  @@unique([currency, date])
  @@map("exchange_rates")
}

// ─────────────────────────────────────────
// USUARIOS (interno — acceso a la app)
// ─────────────────────────────────────────

model User {
  id         String   @id @default(cuid())
  email      String   @unique
  name       String
  role       String   @default("member") // admin | member
  created_at DateTime @default(now())

  interactions  Interaction[]
  time_entries  TimeEntry[]

  @@map("users")
}

// ─────────────────────────────────────────
// CRM
// ─────────────────────────────────────────

model Company {
  id          String        @id @default(cuid())
  name        String
  country     String
  status      CompanyStatus @default(PENDIENTE)
  website     String?
  notes       String?

  // NDA — guardado en la propia entidad, no módulo separado
  nda_signed      Boolean   @default(false)
  nda_signed_date DateTime? @db.Date
  nda_file_url    String?   // Supabase Storage URL

  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  deleted_at  DateTime? // soft delete

  contacts     Contact[]
  interactions Interaction[]
  deals        Deal[]

  @@map("companies")
}

model Contact {
  id         String      @id @default(cuid())
  company_id String
  name       String
  role       ContactRole
  email      String?
  phone      String?
  linkedin   String?
  notes      String?
  created_at DateTime    @default(now())
  updated_at DateTime    @updatedAt

  company      Company       @relation(fields: [company_id], references: [id])
  interactions Interaction[]

  @@map("contacts")
}

model Interaction {
  id             String          @id @default(cuid())
  company_id     String
  contact_id     String?
  user_id        String          // quién registró la interacción
  type           InteractionType
  date           DateTime
  summary        String
  next_step      String          // OBLIGATORIO — no puede ser null
  next_step_date DateTime?       @db.Date
  created_at     DateTime        @default(now())

  company Company  @relation(fields: [company_id], references: [id])
  contact Contact? @relation(fields: [contact_id], references: [id])
  user    User     @relation(fields: [user_id], references: [id])

  @@map("interactions")
}

// ─────────────────────────────────────────
// DEALS
// ─────────────────────────────────────────

model Deal {
  id                String      @id @default(cuid())
  company_id        String
  service           ServiceType
  need              String      // descripción de la necesidad real
  status            DealStatus  @default(OPORTUNIDAD)
  probability       Int?        // 0–100
  expected_close    DateTime?   @db.Date
  next_step         String?
  next_step_date    DateTime?   @db.Date
  loss_reason       String?     // OBLIGATORIO si status = PERDIDO
  notes             String?

  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime? // soft delete

  company   Company    @relation(fields: [company_id], references: [id])
  proposals Proposal[]
  project   Project?   // 1 deal → máximo 1 proyecto activo

  @@map("deals")
}

// ─────────────────────────────────────────
// PROPUESTAS
// ─────────────────────────────────────────

model Proposal {
  id              String         @id @default(cuid())
  deal_id         String
  version         Int            @default(1)
  model           ProposalModel
  amount          Decimal        @db.Decimal(12, 2)
  currency        Currency
  exchange_rate   Decimal        @db.Decimal(12, 6) // tipo en el momento de crear la propuesta
  amount_usd      Decimal        @db.Decimal(12, 2) // calculado: amount / exchange_rate
  scope           String         // descripción del alcance
  status          ProposalStatus @default(BORRADOR)
  is_current      Boolean        @default(false) // flag "vigente" — sólo una por deal
  file_url        String?        // PDF adjunto en Supabase Storage
  sent_date       DateTime?      @db.Date
  accepted_date   DateTime?      @db.Date
  rejected_reason String?
  created_at      DateTime       @default(now())
  updated_at      DateTime       @updatedAt

  deal     Deal      @relation(fields: [deal_id], references: [id])
  project  Project?  // si fue aceptada y generó proyecto

  @@unique([deal_id, version])
  @@map("proposals")
}

// ─────────────────────────────────────────
// PROYECTOS
// ─────────────────────────────────────────

model Project {
  id                String        @id @default(cuid())
  deal_id           String        @unique
  proposal_id       String        @unique
  service           ServiceType
  status            ProjectStatus @default(PENDIENTE)
  start_date        DateTime?     @db.Date
  end_date_planned  DateTime?     @db.Date
  hours_planned     Decimal?      @db.Decimal(10, 2)
  revenue_planned   Decimal?      @db.Decimal(12, 2)
  currency          Currency
  po_client         String?       // número de PO / contrato del cliente
  payment_terms     String?       // "30 días", "60 días", "hitos", etc.
  notes             String?

  created_at DateTime  @default(now())
  updated_at DateTime  @updatedAt
  deleted_at DateTime? // soft delete

  deal        Deal         @relation(fields: [deal_id], references: [id])
  proposal    Proposal     @relation(fields: [proposal_id], references: [id])
  milestones  Milestone[]
  assignments Assignment[]
  time_entries TimeEntry[]
  invoices    Invoice[]

  // Campos calculados (se computan en queries, no se guardan)
  // hours_actual    = SUM(time_entries.hours)
  // revenue_actual  = SUM(invoices[cobradas].amount_usd)
  // cost_actual     = SUM(time_entries.hours * resource.cost_per_hour)
  // margin          = revenue_actual - cost_actual

  @@map("projects")
}

// ─────────────────────────────────────────
// HITOS
// ─────────────────────────────────────────

model Milestone {
  id           String          @id @default(cuid())
  project_id   String
  name         String
  amount       Decimal         @db.Decimal(12, 2)
  currency     Currency
  planned_date DateTime?       @db.Date
  status       MilestoneStatus @default(PENDIENTE)
  created_at   DateTime        @default(now())
  updated_at   DateTime        @updatedAt

  project  Project   @relation(fields: [project_id], references: [id])
  invoices Invoice[]

  @@map("milestones")
}

// ─────────────────────────────────────────
// RECURSOS
// ─────────────────────────────────────────

model Resource {
  id              String       @id @default(cuid())
  name            String
  type            ResourceType
  cost_per_hour   Decimal      @db.Decimal(10, 2)
  cost_currency   Currency
  email           String?
  active          Boolean      @default(true)
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt

  assignments  Assignment[]
  time_entries TimeEntry[]

  @@map("resources")
}

model Assignment {
  id             String   @id @default(cuid())
  project_id     String
  resource_id    String
  hours_assigned Decimal  @db.Decimal(10, 2)
  created_at     DateTime @default(now())

  project  Project  @relation(fields: [project_id], references: [id])
  resource Resource @relation(fields: [resource_id], references: [id])

  @@unique([project_id, resource_id])
  @@map("assignments")
}

// ─────────────────────────────────────────
// HORAS
// ─────────────────────────────────────────

model TimeEntry {
  id          String        @id @default(cuid())
  project_id  String
  resource_id String
  user_id     String        // quién registró la entrada
  date        DateTime      @db.Date
  hours       Decimal       @db.Decimal(6, 2)
  type        TimeEntryType
  description String?
  created_at  DateTime      @default(now())
  updated_at  DateTime      @updatedAt

  project  Project  @relation(fields: [project_id], references: [id])
  resource Resource @relation(fields: [resource_id], references: [id])
  user     User     @relation(fields: [user_id], references: [id])

  @@map("time_entries")
}

// ─────────────────────────────────────────
// FACTURACIÓN
// ─────────────────────────────────────────

model Invoice {
  id                    String        @id @default(cuid())
  project_id            String
  milestone_id          String?       // si modelo = HITO
  invoice_number        String        @unique // generado: INV-2024-001
  model                 InvoiceModel
  amount                Decimal       @db.Decimal(12, 2)
  currency              Currency
  exchange_rate_historic Decimal      @db.Decimal(12, 6) // tipo en el momento de emisión
  amount_usd            Decimal       @db.Decimal(12, 2) // calculado
  issue_date            DateTime      @db.Date
  due_date              DateTime      @db.Date
  paid_date             DateTime?     @db.Date
  status                InvoiceStatus @default(EMITIDA)
  notes                 String?
  file_url              String?       // PDF de la factura
  created_at            DateTime      @default(now())
  updated_at            DateTime      @updatedAt

  project   Project    @relation(fields: [project_id], references: [id])
  milestone Milestone? @relation(fields: [milestone_id], references: [id])
  items     InvoiceItem[]

  @@map("invoices")
}

model InvoiceItem {
  id          String  @id @default(cuid())
  invoice_id  String
  description String
  quantity    Decimal @db.Decimal(10, 2)
  unit_price  Decimal @db.Decimal(12, 2)
  total       Decimal @db.Decimal(12, 2) // quantity * unit_price

  invoice Invoice @relation(fields: [invoice_id], references: [id])

  @@map("invoice_items")
}
```

---

## 3. MÓDULOS Y RUTAS

### Mapa de rutas (Next.js App Router)

```
app/
├── (auth)/
│   └── login/                    → Pantalla de login
│
├── (app)/
│   ├── layout.tsx                → Shell principal (sidebar + topbar)
│   ├── dashboard/                → Vista "HOY"
│   │
│   ├── crm/
│   │   ├── companies/
│   │   │   ├── page.tsx          → Lista de companies con filtros
│   │   │   ├── new/page.tsx      → Crear company
│   │   │   └── [id]/
│   │   │       ├── page.tsx      → Detalle company
│   │   │       └── edit/page.tsx → Editar
│   │   └── contacts/
│   │       ├── page.tsx          → Lista de contacts
│   │       └── [id]/page.tsx     → Detalle contact
│   │
│   ├── deals/
│   │   ├── page.tsx              → Pipeline (vista kanban + lista)
│   │   ├── new/page.tsx          → Crear deal
│   │   └── [id]/
│   │       ├── page.tsx          → Detalle deal + propuestas
│   │       └── edit/page.tsx
│   │
│   ├── proposals/
│   │   └── [id]/page.tsx         → Detalle propuesta (accesible desde deal)
│   │
│   ├── projects/
│   │   ├── page.tsx              → Lista proyectos
│   │   └── [id]/
│   │       ├── page.tsx          → Detalle proyecto
│   │       ├── milestones/       → Gestión hitos
│   │       ├── team/             → Asignación recursos
│   │       ├── hours/            → Registro de horas
│   │       └── invoices/         → Facturas del proyecto
│   │
│   ├── resources/
│   │   ├── page.tsx              → Lista recursos
│   │   └── [id]/page.tsx         → Detalle recurso + asignaciones
│   │
│   ├── invoices/
│   │   ├── page.tsx              → Todas las facturas + filtros
│   │   └── [id]/page.tsx         → Detalle factura
│   │
│   └── settings/
│       ├── exchange-rates/page.tsx → Tipos de cambio
│       └── users/page.tsx          → Gestión usuarios
│
└── api/
    ├── companies/
    ├── contacts/
    ├── interactions/
    ├── deals/
    ├── proposals/
    ├── projects/
    ├── milestones/
    ├── resources/
    ├── time-entries/
    ├── invoices/
    ├── exchange-rates/
    └── dashboard/
```

### Responsabilidad de cada módulo

**Dashboard** — agrega datos de todos los módulos para dar una vista operativa del día.
Queries que ejecuta:
- Deals con `next_step_date < hoy` y sin acción reciente
- Proyectos donde `hours_actual / hours_planned > 0.85`
- Facturas con `status = EMITIDA` y `due_date < hoy`
- Próximas reuniones (interactions con `next_step_date` en los próximos 7 días)

**CRM** — gestiona Companies, Contacts e Interactions. Es el módulo de entrada para cualquier relación comercial. Una Company debe existir antes de crear un Deal.

**Deals** — pipeline comercial. No contiene datos económicos (eso va en Proposals). Contiene la necesidad del cliente, el estadio comercial y el siguiente paso.

**Proposals** — entidad económica. Cada Deal puede tener N versiones de propuesta pero sólo una `is_current = true`. La propuesta aceptada es el contrato económico que alimenta el proyecto.

**Projects** — creados exclusivamente desde `Deal.status = GANADO` + `Proposal.status = ACEPTADO`. Hereda datos del Deal y la Proposal. El proyecto es la unidad operativa.

**Milestones** — hitos del proyecto. Necesarios para facturación por hitos. Se crean dentro del proyecto.

**Resources** — catálogo de personas (internas y externas) con su coste/hora. No hay gestión de capacidad semanal en MVP.

**Time Entries** — registro diario de horas por proyecto y recurso. Es la fuente de verdad para margen real y facturación por horas.

**Invoices** — facturas ligadas a un proyecto. Pueden referenciar horas (TimeEntries del período) o un Milestone específico.

**Settings > Exchange Rates** — tabla editable de tipos de cambio por fecha. Se consulta siempre tomando el tipo más reciente a la fecha de cada transacción.

---

## 4. FLUJOS CLAVE

### Flujo 1: Del prospecto a cliente activo

```
Company (PENDIENTE)
  └─→ Interaction registrada → Company (CONTACTADO)
        └─→ Respuesta → Company (RESPONDIO)
              └─→ Reunión programada → Company (REUNION)
                    └─→ NDA firmado (campo en Company)
                          └─→ Deal creado → Company (ACTIVA)
```

Reglas de negocio:
- No se puede crear un Deal sin que la Company exista
- Al crear un Deal, la Company pasa automáticamente a ACTIVA si no lo estaba
- Cada Interaction requiere `next_step` no vacío

### Flujo 2: Del deal a proyecto

```
Deal (OPORTUNIDAD → ANALISIS → PROPUESTA)
  └─→ Proposal creada (versión 1, BORRADOR)
        └─→ Enviada al cliente → Proposal (ENVIADO)
              ├─→ Rechazada → Proposal (RECHAZADO) → nueva versión o Deal (PERDIDO)
              └─→ Aceptada  → Proposal (ACEPTADO) + is_current = true
                                └─→ Deal (GANADO)
                                      └─→ Project creado (hereda company, service, revenue_planned, moneda)
```

Reglas de negocio:
- Solo se puede crear Project desde Deal con status GANADO
- El Project requiere obligatoriamente una `proposal_id` (la propuesta aceptada)
- Al marcar Deal como PERDIDO, `loss_reason` es campo obligatorio
- Al marcar una Proposal como ACEPTADO, el sistema limpia `is_current` de las otras versiones del mismo Deal

### Flujo 3: Ejecución del proyecto

```
Project (ACTIVO)
  ├─→ Recursos asignados (Assignment)
  ├─→ Horas imputadas (TimeEntry) → coste real acumulado
  └─→ Hitos definidos (Milestone) → base para facturación
```

### Flujo 4: Facturación por horas

```
Project ACTIVO
  └─→ TimeEntries del período (filtrar por fecha + tipo FACTURABLE)
        └─→ Invoice creada (modelo HORAS)
              ├─→ InvoiceItems generados (uno por recurso o línea de detalle)
              └─→ Exchange rate histórico capturado en el momento de emisión
                    └─→ Invoice (EMITIDA → COBRADA)
```

### Flujo 5: Facturación por hito

```
Milestone (COMPLETADO)
  └─→ Invoice creada (modelo HITO, milestone_id referenciado)
        └─→ Milestone pasa a FACTURADO
              └─→ Invoice (EMITIDA → COBRADA)
```

### Flujo 6: Tipos de cambio

```
Settings → Exchange Rates
  └─→ Tabla: [moneda | fecha | tipo vs USD]

Al crear Invoice o Proposal:
  └─→ Query: SELECT rate_vs_usd FROM exchange_rates
             WHERE currency = X AND date <= :fecha
             ORDER BY date DESC LIMIT 1
  └─→ Se guarda en la entidad como campo histórico inmutable
```

---

## 5. API DESIGN

### Convenciones

- REST con Next.js Route Handlers
- Validación de input con **Zod**
- Respuestas: `{ data, error, meta? }`
- Errores HTTP estándar: 400 Bad Request, 401 Unauthorized, 404 Not Found, 422 Unprocessable Entity
- Paginación en listas: `?page=1&limit=20`

### Endpoints principales

```
# Companies
GET    /api/companies              → lista con filtros (status, country, search)
POST   /api/companies              → crear
GET    /api/companies/:id          → detalle + contacts + interactions + deals
PATCH  /api/companies/:id          → actualizar
DELETE /api/companies/:id          → soft delete

# Contacts
GET    /api/contacts?company_id=X  → contacts de una company
POST   /api/contacts               → crear (requiere company_id)
PATCH  /api/contacts/:id

# Interactions
GET    /api/interactions?company_id=X
POST   /api/interactions           → crear (next_step validado como obligatorio)
PATCH  /api/interactions/:id

# Deals
GET    /api/deals                  → pipeline completo con filtros
POST   /api/deals                  → crear (requiere company_id existente)
GET    /api/deals/:id              → detalle + proposals
PATCH  /api/deals/:id              → actualizar estado
DELETE /api/deals/:id              → soft delete

# Proposals
GET    /api/proposals?deal_id=X    → versiones de un deal
POST   /api/proposals              → crear nueva versión
PATCH  /api/proposals/:id          → actualizar
POST   /api/proposals/:id/accept   → marcar como aceptada (limpia is_current de otras)
POST   /api/proposals/:id/reject

# Projects
GET    /api/projects               → lista con estado y métricas
POST   /api/projects               → crear desde deal ganado (valida deal.status = GANADO)
GET    /api/projects/:id           → detalle + equipo + horas + facturas
PATCH  /api/projects/:id

# Milestones
GET    /api/projects/:id/milestones
POST   /api/projects/:id/milestones
PATCH  /api/milestones/:id

# Time Entries
GET    /api/time-entries?project_id=X&from=Y&to=Z
POST   /api/time-entries
PATCH  /api/time-entries/:id
DELETE /api/time-entries/:id

# Resources
GET    /api/resources
POST   /api/resources
PATCH  /api/resources/:id

# Assignments
GET    /api/assignments?project_id=X
POST   /api/assignments
PATCH  /api/assignments/:id

# Invoices
GET    /api/invoices               → con filtros (project, status, periodo)
POST   /api/invoices               → crear (captura exchange_rate_historic automáticamente)
PATCH  /api/invoices/:id/status    → cambiar estado (emitida → cobrada, etc.)

# Exchange Rates
GET    /api/exchange-rates         → tabla completa
POST   /api/exchange-rates         → añadir tipo para fecha
GET    /api/exchange-rates/current?currency=MXN → tipo más reciente

# Dashboard
GET    /api/dashboard              → agrega todos los KPIs y alertas del día
```

---

## 6. KPIs — QUERIES DE REFERENCIA

### Comercial

```sql
-- Deals activos (no ganados ni perdidos)
SELECT COUNT(*) FROM deals
WHERE status NOT IN ('GANADO', 'PERDIDO') AND deleted_at IS NULL;

-- Ratio de cierre (últimos 90 días)
SELECT
  COUNT(CASE WHEN status = 'GANADO' THEN 1 END) * 100.0 /
  NULLIF(COUNT(CASE WHEN status IN ('GANADO', 'PERDIDO') THEN 1 END), 0) AS close_rate
FROM deals
WHERE updated_at > NOW() - INTERVAL '90 days';

-- Propuestas enviadas pendientes de respuesta
SELECT COUNT(*) FROM proposals WHERE status = 'ENVIADO';
```

### Operativo

```sql
-- Proyectos activos con % de horas consumidas
SELECT
  p.id, p.hours_planned,
  COALESCE(SUM(te.hours), 0) AS hours_actual,
  COALESCE(SUM(te.hours), 0) * 100.0 / NULLIF(p.hours_planned, 0) AS hours_pct
FROM projects p
LEFT JOIN time_entries te ON te.project_id = p.id
WHERE p.status = 'ACTIVO'
GROUP BY p.id, p.hours_planned;

-- Horas facturables del mes actual
SELECT COALESCE(SUM(hours), 0) FROM time_entries
WHERE type = 'FACTURABLE'
AND date >= DATE_TRUNC('month', NOW())
AND date < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
```

### Financiero

```sql
-- Facturación mensual en USD
SELECT
  DATE_TRUNC('month', issue_date) AS month,
  SUM(amount_usd) AS total_usd
FROM invoices
WHERE status = 'COBRADA'
GROUP BY 1 ORDER BY 1 DESC;

-- Margen por proyecto
SELECT
  p.id,
  p.revenue_planned,
  COALESCE(SUM(i.amount_usd) FILTER (WHERE i.status = 'COBRADA'), 0) AS revenue_actual,
  COALESCE(SUM(te.hours * r.cost_per_hour), 0) AS cost_actual,
  COALESCE(SUM(i.amount_usd) FILTER (WHERE i.status = 'COBRADA'), 0)
    - COALESCE(SUM(te.hours * r.cost_per_hour), 0) AS margin
FROM projects p
LEFT JOIN invoices i ON i.project_id = p.id
LEFT JOIN time_entries te ON te.project_id = p.id
LEFT JOIN resources r ON r.id = te.resource_id
GROUP BY p.id, p.revenue_planned;

-- Backlog (revenue previsto de proyectos activos no facturado aún)
SELECT
  SUM(p.revenue_planned) - COALESCE(SUM(i.amount_usd) FILTER (WHERE i.status != 'VENCIDA'), 0)
FROM projects p
LEFT JOIN invoices i ON i.project_id = p.id
WHERE p.status IN ('PENDIENTE', 'ACTIVO');
```

---

## 7. PLAN MVP — FASES

### Fase 0 — Setup (1 semana)

- [ ] Crear proyecto Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] Configurar Supabase (PostgreSQL + Storage)
- [ ] Configurar Prisma + schema inicial
- [ ] Primera migración
- [ ] Setup NextAuth con Google OAuth
- [ ] Deploy en Vercel
- [ ] CI básico (lint + typecheck en PR)

### Fase 1 — CRM + Pipeline (3 semanas)

Objetivo: poder gestionar toda la actividad comercial.

- [ ] Companies: CRUD + estados + NDA
- [ ] Contacts: CRUD asociado a Company
- [ ] Interactions: crear con next_step obligatorio
- [ ] Deals: CRUD + pipeline kanban básico
- [ ] Proposals: versiones + flag is_current + estados
- [ ] Exchange Rates: tabla editable en Settings
- [ ] Dashboard: vista básica con alertas de deals sin next_step

Criterio de done: el equipo comercial puede gestionar todo su pipeline sin Excel.

### Fase 2 — Proyectos + Horas (3 semanas)

Objetivo: control operativo real.

- [ ] Projects: creación desde deal ganado (con validación)
- [ ] Milestones: CRUD dentro del proyecto
- [ ] Resources: catálogo interno/externo con coste/hora
- [ ] Assignments: asignación de recursos a proyectos
- [ ] Time Entries: registro diario de horas
- [ ] Dashboard: añadir alerta proyectos con >85% horas consumidas

Criterio de done: se puede ver en tiempo real el margen de cada proyecto.

### Fase 3 — Facturación + KPIs (2 semanas)

Objetivo: cerrar el ciclo económico.

- [ ] Invoices: por horas o por hito
- [ ] InvoiceItems: líneas de detalle
- [ ] Exchange rate histórico en Invoice (automático)
- [ ] Dashboard: facturas vencidas
- [ ] KPIs page: comercial + operativo + financiero
- [ ] Exportación a CSV de deals, proyectos y facturas

Criterio de done: el responsable financiero puede ver el P&L de la empresa sin abrir Excel.

**Total estimado: 9 semanas para un equipo de 1 desarrollador. 5 semanas con 2.**

---

## 8. ESTRUCTURA DE CÓDIGO

```
epc-ops/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← Shell principal
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── crm/
│   │   │   ├── companies/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── contacts/
│   │   │       └── [id]/page.tsx
│   │   ├── deals/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── milestones/page.tsx
│   │   │       ├── team/page.tsx
│   │   │       ├── hours/page.tsx
│   │   │       └── invoices/page.tsx
│   │   ├── resources/
│   │   │   └── page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── settings/
│   │       ├── exchange-rates/page.tsx
│   │       └── users/page.tsx
│   └── api/
│       ├── companies/
│       │   ├── route.ts            ← GET (list) + POST (create)
│       │   └── [id]/route.ts       ← GET + PATCH + DELETE
│       ├── contacts/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── interactions/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── deals/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── proposals/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── accept/route.ts
│       │       └── reject/route.ts
│       ├── projects/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── milestones/route.ts
│       │       └── assignments/route.ts
│       ├── milestones/[id]/route.ts
│       ├── time-entries/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── resources/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── invoices/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── exchange-rates/
│       │   ├── route.ts
│       │   └── current/route.ts
│       └── dashboard/route.ts
│
├── components/
│   ├── ui/                         ← shadcn/ui components (auto-generados)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageHeader.tsx
│   ├── crm/
│   │   ├── CompanyCard.tsx
│   │   ├── CompanyStatusBadge.tsx
│   │   ├── ContactCard.tsx
│   │   └── InteractionForm.tsx
│   ├── deals/
│   │   ├── DealKanban.tsx
│   │   ├── DealCard.tsx
│   │   ├── DealStatusBadge.tsx
│   │   └── ProposalVersionList.tsx
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectMetrics.tsx      ← horas, margen en tiempo real
│   │   ├── MilestoneList.tsx
│   │   ├── TimeEntryForm.tsx
│   │   └── AssignmentList.tsx
│   ├── invoices/
│   │   ├── InvoiceStatusBadge.tsx
│   │   └── InvoiceTable.tsx
│   └── dashboard/
│       ├── AlertCard.tsx
│       ├── KpiCard.tsx
│       └── DashboardGrid.tsx
│
├── lib/
│   ├── prisma.ts                   ← singleton PrismaClient
│   ├── auth.ts                     ← NextAuth config
│   ├── validations/
│   │   ├── company.ts              ← Zod schemas
│   │   ├── deal.ts
│   │   ├── proposal.ts
│   │   ├── project.ts
│   │   ├── time-entry.ts
│   │   └── invoice.ts
│   ├── queries/
│   │   ├── dashboard.ts            ← queries agregadas para dashboard
│   │   ├── kpis.ts                 ← queries de KPIs
│   │   └── exchange-rates.ts       ← helper para obtener tipo histórico
│   └── utils/
│       ├── currency.ts             ← formatear moneda, conversión
│       ├── dates.ts
│       └── cn.ts                   ← classnames helper
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     ← datos de prueba
│
├── types/
│   └── index.ts                    ← tipos derivados de Prisma
│
├── .env.local                      ← DATABASE_URL, NEXTAUTH_SECRET, etc.
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 9. DECISIONES Y TRADE-OFFS EXPLÍCITOS

| Decisión | Elegido | Alternativa | Por qué |
|----------|---------|-------------|---------|
| Arquitectura | Monorepo Next.js | Frontend + API separados | Menos complejidad operativa para equipo pequeño |
| Base de datos | PostgreSQL/Supabase | SQLite, MongoDB | Relacional es necesario para las FK; Supabase elimina ops de DB |
| ORM | Prisma | Drizzle, TypeORM | Mejor DX, migraciones declarativas, type-safety completa |
| Auth | NextAuth | Auth0, Supabase Auth | Gratis, flexible, control total |
| UI | shadcn/ui | MUI, Chakra | Sin bundle bloat, componentes copiados al proyecto |
| Multimoneda | Guardar tipo histórico por transacción | Recalcular siempre | Inmutabilidad contable — los registros pasados no cambian |
| Soft delete | Solo en Companies, Deals, Projects | En todas las tablas | Pragmatismo: lo que importa auditando son estas entidades |
| Automatizaciones | Dashboard con queries en tiempo real | Cron jobs, workers | Sin infraestructura adicional en MVP; mismo efecto visual |
| PDF de facturas | Adjunto manual en Fase 1 | Generación automática | Simplifica MVP; la generación se añade en Fase 3 |

---

## 10. VARIABLES DE ENTORNO

```env
# Base de datos
DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="https://epc-ops.vercel.app"
NEXTAUTH_SECRET="[generado con openssl rand -base64 32]"

# Google OAuth (opcional — se puede usar email/password)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_STORAGE_BUCKET="epc-ops-files"
```

---

## RESUMEN EJECUTIVO

**Stack**: Next.js 14 + TypeScript + Prisma + PostgreSQL (Supabase) + Vercel
**Tiempo a producción MVP completo**: 9 semanas (solo) / 5 semanas (dos devs)
**Coste mensual de infraestructura** en MVP: ~0€ (Supabase free tier + Vercel free tier)
**Coste cuando crezca**: Supabase Pro ($25/mes) + Vercel Pro ($20/mes) = $45/mes

El sistema tiene 10 entidades principales con relaciones explícitas, trazabilidad completa Deal → Proposal → Project → Invoice, y tipos de cambio históricos por transacción. No hay lógica duplicada: cada dato tiene un único lugar en el modelo.
