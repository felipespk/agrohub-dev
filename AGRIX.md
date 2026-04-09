# AGRIX — Product Specification

## What is Agrix?
A web-based SaaS platform for Brazilian rural property management. It unifies four core operations into one system: grain dryer/silo management, financial control, cattle management, and crop management. It includes interactive satellite mapping of farm areas and an admin panel for multi-user oversight.

**Language:** All user-facing text is in Brazilian Portuguese (pt-BR).
**Tech Stack:** React + TypeScript + Vite, Supabase (PostgreSQL + Auth), Tailwind CSS + shadcn/ui, Recharts, Leaflet maps, ExcelJS.
**Design reference:** Modern agritech/fintech SaaS — think AgriVision, Farmly, Linear. Clean, premium, lots of whitespace. NOT a generic admin template. Palette: #111110 (black), #78FC90 (green neon), #F6F6F6 (light gray), #FFFFFF (white). Sidebar is thin icon-only (60px, never expands). Navigation uses tabs at the top of content area. Cards have 16px radius, thin borders, no heavy shadows.

---

## Authentication
- Email/password login via Supabase Auth
- Pages: Login (split-screen with farm aerial photo on left, form on right), Register, Forgot Password, Reset Password
- On login success → redirect to Hub
- All app routes are protected (redirect to /login if not authenticated)
- On registration, auto-create a row in `profiles` table with user_id and email

---

## Hub (Home Screen)
After login, user sees the Hub — a centered page with:
- Greeting based on time: "Bom dia/Boa tarde/Boa noite, [FirstName]!"
- 4 module cards to navigate into: Secador/Silo, Financeiro, Pecuária, Lavoura
- Link to "Mapa da Fazenda" (interactive map)
- If user is admin (profiles.is_admin = true): show a 5th card "Painel Admin"
- Footer with user email and logout

---

## Module: Secador / Silo (Grain Dryer)

Manages grain receiving, weighing, storage, expedition, and technical loss.

### Data entities:
- **Grain Types** (tipos_grao): name. Has child **Grain Varieties** (variedades_grao).
- **Producers** (produtores): name, cpf/cnpj, phone, email, address
- **Buyers** (compradores): name, cpf/cnpj, phone
- **Receiving** (recebimentos): date, producer, grain type/variety, vehicle plate, invoice, gross weight, tare, net weight, moisture %, impurity %, discounts (auto-calculated), adjusted weight, notes
- **Outgoing** (saidas): date, type (sale/transfer/sample/other), buyer, grain, weights, price per sack, total value, invoice
- **Technical Loss** (quebras_tecnicas): date, grain type, weight kg, reason, notes

### Pages:
- **Dashboard**: KPIs — Current Stock (tons), Gross Volume, Received (Adjusted), Expedited this month, Technical Loss total
- **Recebimento**: Form to register grain entry. Auto-calculates discounts from moisture/impurity. Saves adjusted weight.
- **Saída (Venda)**: Grain sales form with buyer, price, weight
- **Saída Geral**: Non-sale outgoing (transfers, samples)
- **Armazenamento**: FIFO (first in, first out) storage view grouped by grain type
- **Expedição**: Loading/shipping management
- **Relatório**: Reports filterable by period, grain type, producer
- **Quebra Técnica**: Log technical losses
- **Cadastro**: CRUD for grain types, varieties, producers, buyers
- **Configurações**: Module settings — farm name, grain type defaults, technical loss parameters, master password

### Special features:
- Automatic discount calculation based on moisture and impurity percentages
- FIFO storage tracking
- Master password required to edit/delete records older than 48 hours

---

## Module: Financeiro (Financial)

Central financial control that consolidates costs and revenue from ALL farm activities via Cost Centers.

### Data entities:
- **Cost Centers** (centros_custo): name, color, icon, active. Auto-seeded on first load: "Secador / Silo", "Pecuária", "Lavoura", "Administrativo"
- **Bank Accounts** (contas_bancarias): name, bank, agency, account number, type, current balance, active
- **Categories** (categorias_financeiras): name, type (receita/despesa/investimento). FLAT list — no parent-child hierarchy.
- **Contacts** (contatos_financeiros): name, type (fornecedor/cliente/ambos), cpf/cnpj, phone, email, address
- **Accounts Payable/Receivable** (contas_pr): type (pagar/receber), description, total value, paid value, due date, payment date, status (aberto/pago/vencido/cancelado), linked to category, cost center, contact, bank account
- **Transactions** (lancamentos): type (receita/despesa/transferencia), value, date, description, linked to category, cost center, bank account, destination account (for transfers), contact, account PR

### Pages:
- **Dashboard**: KPIs — Total Bank Balance, Revenue in Period, Expenses in Period, Net Result. Chart: Revenue vs Expenses by month. Result by Activity (per cost center). Overdue accounts list. Next 7 days due. Cash flow chart (last 30 days area chart).
- **Contas a Pagar**: Filterable table of payables. Create, edit, mark as paid (creates lancamento + updates bank balance).
- **Contas a Receber**: Same structure for receivables.
- **Lançamentos**: All transactions table with filters (type, center, category, date range, search). Create manual entries. When creating: update bank balance automatically.
- **Fluxo de Caixa**: Cash flow timeline view
- **Contas Bancárias**: Bank account management with balances
- **Categorias**: Simple CRUD (name + type only, no hierarchy)
- **Centros de Custo**: Cost center management
- **Contatos**: Contact/supplier/client management
- **Configurações**: Farm name, master password

### Special features:
- Period filter on dashboard: Este Mês, 3 Meses, 6 Meses, Ano, **Personalizado** (two date inputs appear)
- Cost center filter on dashboard
- Comparison with previous period (% change shown on KPIs)
- IMPORTANT: When querying lancamentos from Supabase, do NOT use explicit foreign key names in JOINs (causes silent failures). Use SELECT * and enrich with frontend lookups.
- Professional Excel export (ExcelJS) with formatted headers, zebra rows, totals, currency formatting

### Financial integration helper (used by other modules):
- `criarLancamentoReceita(userId, valor, data, descricao, centroCustoId, contaPrId?)` — finds first active bank account, creates lancamento type receita, updates bank balance
- `buscarCentroCusto(userId, nomePattern)` — finds cost center by name pattern (ilike)

---

## Module: Pecuária (Cattle)

Complete cattle management: animals, weighing, health, buying/selling, reproduction.

### Data entities:
- **Breeds** (racas): name
- **Pastures** (pastos): name, area (hectares), capacity (heads), coordinates (JSONB for map polygon), center lat/lng
- **Lots** (lotes): name, linked to pasture
- **Animals** (animais): tag (brinco), sex, category (vaca/touro/bezerro/bezerra/novilha/garrote/boi), breed, color, birth date, entry date, origin (nascido/comprado), father tag, mother tag, pasture, lot, current weight, status (ativo/vendido/morto), photo url, notes, category_updated_at
  - **NO "name" field** — farmers don't name animals. Use brinco + category everywhere.
- **Weighings** (pesagens): animal, date, weight kg, notes
- **Medications** (medicamentos): name, type (vacina/vermifugo/medicamento/suplemento), manufacturer, withdrawal days
- **Health Applications** (aplicacoes_sanitarias): animal, medication, date, dose, next dose date, notes
- **Movements** (movimentacoes_gado): type (compra/venda/nascimento/morte/transferencia), animal, date, quantity, weight, value, origin/destination pasture, death cause, calf details, notes
- **Reproduction** (reproducao): cow, bull, breeding date, expected birth, actual birth, result, notes

### Pages:
- **Dashboard**: KPIs — Total Heads (active only), Average Weight, Births (in period), Deaths (in period). Donut chart: Herd Composition by category. Arroba (@) price display with outdated warning (>7 days). Upcoming vaccines list. Recent movements list.
- **Animais**: Table with columns: Brinco, Category (colored badge), Sex, Breed, Pasture, Weight KG, Weight @ (arrobas), Estimated Value (R$), Status. Filters by pasture, category, status. Create/delete.
- **Ficha do Animal** (/gado/animais/:id): Detailed view — all animal data, weight evolution chart, health history, movement history
- **Pastos e Lotes**: Cards per pasture showing: name, area, capacity, occupation bar (colored by percentage: green <70%, yellow 70-90%, red >90%), average weight, estimated value. Actions: edit (including area correction), delete (only if empty), move animals (multi-select with checkboxes). Lots inside pastures with edit/delete.
- **Pesagens**: Table with GMD (Ganho Médio Diário = Daily Weight Gain) auto-calculated and color-coded. Search by brinco.
- **Sanidade**: Medication catalog + application records. **Batch vaccination**: select medication + date, then multi-select animals (checkboxes) with filters by pasture/category and "Select All"/"Select None" buttons.
- **Movimentações**: All movement types. Sales have "Tipo de Pagamento" (À Vista / A Prazo). Cash sales auto-create lancamento + update bank balance.
- **Reprodução**: Breeding records
- **Raças**: Breed CRUD
- **Configurações**: Carcass yield %, Arroba price (value + date), Life Phase Ages (bezerro until X months, jovem until Y months, auto-reclassification toggle), unit preferences

### Special features:

**Automatic age-based reclassification:**
- Configured in settings: idade_bezerro_meses (default 8), idade_jovem_meses (default 24)
- On module load, system checks all active animals with birth dates:
  - age < bezerro months → bezerro/bezerra
  - age >= bezerro AND < jovem → garrote/novilha  
  - age >= jovem → boi/vaca
  - EXCEPTION: touro is NEVER auto-reclassified (set manually)
- Shows toast when animals are reclassified
- Sets categoria_atualizada_em timestamp, shows "Atualizado" badge for 7 days

**Birth registration:**
- When creating animal with origem='nascido', auto-create movimentacao tipo='nascimento'
- Dashboard counts births by `animais WHERE origem='nascido' AND data_nascimento in period` (not just movimentacoes)

**GMD (Daily Weight Gain):**
- Formula: (current_weight - previous_weight) / days_between
- Color: green >0.3, yellow 0.15-0.3, red <0.15

**Estimated Value:**
- Formula: peso_atual × rendimento_carcaca / 100 / 15 × valor_arroba
- Shown in: animal table, animal detail, map popup

**Financial integration:**
- Sale → creates contas_pr (receber, centro "Pecuária"). Cash sale also creates lancamento + updates bank balance.
- Purchase → creates contas_pr (pagar, centro "Pecuária")

---

## Module: Lavoura (Crop)

Crop planning, field activities, input inventory, machinery, harvest, and sales management.

### Data entities:
- **Fields** (talhoes): name, area (hectares), soil type, coordinates (JSONB), center lat/lng, active
- **Cultures** (culturas): name, harvest unit (sacas/ha, ton/ha, etc), average cycle days
- **Culture Varieties** (variedades_cultura): linked to culture, name
- **Seasons** (safras): name, start date, end date, status (planejamento/andamento/finalizada)
- **Season-Fields** (safra_talhoes): links safra + talhão + cultura + variety, with planned planting date, harvest date, productivity goal. UNIQUE on (safra_id, talhao_id).
- **Inputs** (insumos): name, category (semente/fertilizante/defensivo/combustivel/outro), unit, unit price, current stock, minimum stock
- **Input Movements** (movimentacoes_insumo): input, type (entrada/saida), quantity, date, supplier, total value
- **Machines** (maquinas): name, type (trator/colheitadeira/pulverizador/plantadeira/outro), model, year, plate/chassis, acquisition value, cost per hour
- **Maintenance** (manutencoes): machine, date, type (preventiva/corretiva), description, cost, next maintenance date
- **Field Activities** (atividades_campo): season-field, type (plantio/adubacao/pulverizacao/irrigacao/capina/colheita/outro), date, area covered, input used + quantity, machine used + hours, operator, total cost, notes, weather condition
- **Pest Occurrences** (ocorrencias_mip): season-field, date, type (praga/doenca/daninha), name, severity (baixo/medio/alto/critico), decision (monitorar/aplicar/nenhuma), photo url
- **Harvests** (colheitas): season-field, date, quantity, moisture %, calculated productivity, destination (silo/venda_direta/cooperativa)
- **Commercialization** (comercializacao): season, culture, buyer, quantity, unit price, total value, sale date, contract type (avista/prazo/barter)

### Pages:
- **Dashboard**: KPIs — Planted Area (ha), Active Fields, Activities this Month, Average Productivity. Productivity chart by field. Culture distribution. Pest alerts.
- **Talhões**: Field management CRUD
- **Safras**: Season management. Detail page to link fields with culture, variety, dates, and goals.
- **Caderno de Campo** (Atividades): Field notebook. Filters by **Safra** AND **activity type**. Auto-calculates cost (input qty × price + machine hours × cost/hr). Auto-deducts from input stock on save. Creates movimentacao_insumo tipo saida.
- **Estoque de Insumos**: KPI cards (total items, low stock alerts, stock value). CRUD for inputs. Register entries (creates contas_pr when value > 0, centro "Lavoura").
- **Máquinas**: Equipment registry with maintenance history
- **Colheitas**: Harvest records. Auto-calculates productivity (quantity / area). Direct sale option creates comercializacao + contas_pr + lancamento.
- **Pragas / MIP**: Pest monitoring. Critical level items pulse red visually.
- **Comercialização**: Sales management. Cash sales create lancamento + update bank balance.
- **Relatórios**: 4 reports — Production Cost per field, Productivity comparison, Input consumption, Machine usage history
- **Culturas**: Culture CRUD with varieties
- **Configurações**: Farm name

---

## Interactive Map (/mapa)

Full-screen satellite map showing farm fields and pastures with data overlays.

### Technology:
- Leaflet (NOT react-leaflet-draw — it's incompatible with React 18)
- Satellite tiles from Esri
- Normal tiles from OpenStreetMap (toggle between them)
- Custom polygon drawing implementation (click to add points, button or double-click to finish)
- Geocoding via Nominatim (free, no API key)

### Farm location setup:
- First access: search bar accepts city names (Nominatim) AND coordinates (decimal or DMS format like "10°24'17.46"S 49°37'15.41"W")
- GPS button for browser geolocation
- Click on map to set farm pin, confirm to save
- Location saved PER MODULE (fazenda_lat_lavoura, fazenda_lat_gado, etc.)

### Features:
- Property selector (Todas / Lavoura / Pecuária / Secador) filters visible polygons and centers map
- Links from module sidebars pass ?modulo= parameter
- Toggle satellite / normal map

### Field polygons (talhões):
- Color by culture when a safra is selected (Soja=green, Milho=yellow, Arroz=cyan, etc.) + legend
- Popup on click: name, area (from DB not calculated), soil type, culture, productivity, cost/ha, pest alerts

### Pasture polygons:
- Color by occupation: green <70%, yellow 70-90%, red >90%
- Popup on click: name, area, occupation bar, average weight, estimated value, **list of animals** (brinco, category badge, age, weight), vaccine alerts

### Drawing tool:
- Custom implementation: "Desenhar Polígono" button, click adds points, "Finalizar" button or double-click finishes
- "Desfazer último ponto" button
- On finish: modal to bind to existing talhão/pasto or create new
- Binding to existing: DOES NOT overwrite area_hectares from DB
- Creating new: editable area field pre-filled with calculated area

### Side panel (280px right):
- Lists all talhões and pastos with status (Mapeado / Sem mapa)
- Click: flyTo polygon + open popup
- Totals at bottom

### Navigation bar at top:
- Back buttons (Hub, Lavoura, Pecuária)
- Search bar (address + coordinates)
- Property selector, toggles, safra dropdown, satellite toggle

---

## Admin Panel (/admin)

### Access:
- Only for users with is_admin = true in profiles
- Password required EVERY TIME (no session cache). Fixed password verified via SHA-256 hash. 3 failed attempts = 30 second lockout.

### Features:
- KPI cards: Total Users, Active Users (last 30 days), Total Animals, Total Fields
- User table showing ALL accounts (uses a database view joining auth.users with profiles). Columns: email, farm name, registration date, counts, admin badge
- Actions: "Entrar como" (impersonation), "Tornar Admin", "Remover Admin"

### Impersonation:
- Read-only mode: admin sees user's data but CANNOT edit/create/delete
- Red banner at top: "Visualizando como: [email]" + "Voltar para Admin"
- Uses ImpersonationContext with getEffectiveUserId() to swap user_id in queries
- All write operations blocked with warning toast
- RLS policies allow admins to SELECT from all tables

---

## Cross-Cutting Features

### Master Password:
- Supabase Edge Function for hash/verify (bcrypt)
- Protects edit/delete of records older than 48 hours
- Configured per user, applies globally across modules

### Excel Export:
- Professional formatting with ExcelJS
- Colored header row, zebra-striped data rows
- Currency columns as R$ #,##0.00, dates as DD/MM/YYYY
- Totals row, footer with "Agrix — Gerado em [date]"
- Applied to: Lançamentos, Contas PR, Caderno de Campo, Colheitas, Comercialização

### Period Filters (all dashboards):
- Options: Este Mês, 3 Meses, 6 Meses, Ano, Personalizado (custom date range with two date inputs)

### Profile Dropdown (top-right avatar on all pages):
- Minha Conta, Alterar Senha (modal with supabase.auth.updateUser), Configurações (current module), Sair

### Greeting:
- Time-based: "Bom dia" (before 12), "Boa tarde" (12-18), "Boa noite" (after 18) + first name

---

## Database

The complete schema is in `agrix-schema.sql`. It contains 35+ tables with Row Level Security. Key points:
- Every table has user_id with RLS policy: users manage own data
- Admin RLS policy on every table: admins can SELECT all
- profiles table has per-module settings (farm names, locations, cattle config)
- All tables use UUID primary keys with gen_random_uuid()

### Known technical pitfalls:
1. Supabase JOINs with explicit FK names fail silently — use SELECT * + frontend enrichment
2. react-leaflet-draw is incompatible with React 18 — use custom drawing
3. Leaflet requires CSS import or map won't render
4. Leaflet marker icons need URL fix for Vite
5. Map polygon binding must NOT overwrite manually-set area_hectares

---

## Test Data Reference

Farm coordinates: -10.404850, -49.620947 (10°24'17.46"S 49°37'15.41"W)

Sample pastures: Pasto da Represa (85ha, cap 120), Pasto do Córrego (60ha, cap 80), Retiro Norte (45ha, cap 50), Piquete Maternidade (10ha, cap 20)

Sample fields: Talhão 1 (150ha, argiloso), Talhão 2 (120ha, argiloso), Talhão 3 (80ha, misto), Talhão 4 (95ha, arenoso)

Sample animals: brincos 001-010 with categories vaca, touro, boi, novilha, bezerro, bezerra across different pastures

Sample season: "Safra 2025/2026" with Soja on Talhão 1+2, Milho on Talhão 3, Arroz on Talhão 4