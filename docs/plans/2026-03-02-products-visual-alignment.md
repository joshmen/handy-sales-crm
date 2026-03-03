# Products Visual Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align the Products list page visually to match the Clients list page pattern exactly.

**Architecture:** Single-file visual changes to `products/page.tsx` — column widths, responsive hiding, badge colors, spacing. No logic changes.

**Tech Stack:** Next.js 15, React 19, Tailwind CSS 3.4

---

### Task 1: Desktop Table Header — Column Widths & Responsive Hiding

**Files:**
- Modify: `apps/web/src/app/(dashboard)/products/page.tsx:571-600`

**Step 1: Update table header**

Change the header row from current to target. Key changes:
- `min-w-[850px]` → `min-w-[900px]`
- `px-4` → `px-5`
- Nombre: `min-w-[120px]` → `min-w-[250px]`
- Precio: `w-[85px]` → `w-[90px]`
- Existencia: `w-[70px]` → `w-[90px]`
- Familia: `w-[85px]` → `w-[100px]` + `hidden md:block`
- Categoría: `w-[85px]` → `w-[130px]` + `hidden lg:block`
- Remove Unidad column entirely
- Editar: `w-[45px]` with text → `w-8` no text

Current header (line 571):
```
<div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[850px]">
```

Target header:
```
<div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[900px]">
```

Column changes (lines 590-599):
```
// BEFORE:
<div className="w-[45px] text-xs font-semibold text-gray-600">Imagen</div>
<div className="w-[95px] text-xs font-semibold text-gray-600">Código</div>
<div className="flex-1 min-w-[120px] text-xs font-semibold text-gray-600">Nombre</div>
<div className="w-[85px] text-xs font-semibold text-gray-600">Precio</div>
<div className="w-[70px] text-xs font-semibold text-gray-600">Existencia</div>
<div className="w-[85px] text-xs font-semibold text-gray-600">Familia</div>
<div className="w-[85px] text-xs font-semibold text-gray-600">Categoría</div>
<div className="w-[65px] text-xs font-semibold text-gray-600">Unidad</div>
<div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
<div className="w-[45px] text-xs font-semibold text-gray-600 text-center">Editar</div>

// AFTER:
<div className="w-[45px] text-xs font-semibold text-gray-600">Imagen</div>
<div className="w-[95px] text-xs font-semibold text-gray-600">Código</div>
<div className="flex-1 min-w-[250px] text-xs font-semibold text-gray-600">Nombre</div>
<div className="w-[90px] text-xs font-semibold text-gray-600">Precio</div>
<div className="w-[90px] text-xs font-semibold text-gray-600">Existencia</div>
<div className="w-[100px] text-xs font-semibold text-gray-600 hidden md:block">Familia</div>
<div className="w-[130px] text-xs font-semibold text-gray-600 hidden lg:block">Categoría</div>
<div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
<div className="w-8"></div>
```

**Step 2: Verify visually** — open http://localhost:1083/products on desktop

---

### Task 2: Desktop Table Rows — Match Header Widths

**Files:**
- Modify: `apps/web/src/app/(dashboard)/products/page.tsx:628-698`

**Step 1: Update each table row**

Row wrapper (line 631):
```
// BEFORE:
className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[850px] ...`}

// AFTER:
className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[900px] ...`}
```

Column cells — match new header widths:
```
// Nombre (line 663):
// BEFORE: className="flex-1 min-w-[120px] ..."
// AFTER:  className="flex-1 min-w-[250px] ..."

// Precio (line 666):
// BEFORE: className="w-[85px] ..."
// AFTER:  className="w-[90px] ..."

// Existencia (line 669):
// BEFORE: className={`w-[70px] ...`}
// AFTER:  className={`w-[90px] ...`}

// Familia (line 676):
// BEFORE: className="w-[85px] text-[13px] text-blue-600 truncate"
// AFTER:  className="w-[100px] text-[13px] text-blue-600 truncate hidden md:block"

// Categoría (line 679):
// BEFORE: className="w-[85px] text-[13px] text-gray-500 truncate"
// AFTER:  className="w-[130px] text-[13px] text-gray-500 truncate hidden lg:block"

// Remove Unidad cell entirely (lines 682-684)

// Editar (line 688):
// BEFORE: className="w-[45px] flex items-center justify-center"
// AFTER:  className="w-8 flex items-center justify-center"
```

**Step 2: Verify visually** — check responsive at md/lg breakpoints

---

### Task 3: Mobile Cards — Badge Colors Aligned with Clients

**Files:**
- Modify: `apps/web/src/app/(dashboard)/products/page.tsx:492-563`

**Step 1: Update card wrapper padding**

```
// BEFORE (line 496):
className={`bg-white border border-gray-200 rounded-lg p-4 ...`}

// AFTER:
className={`bg-white border border-gray-200 rounded-lg p-3 ...`}
```

**Step 2: Update badge colors (lines 532-552)**

```
// BEFORE:
<span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">

// AFTER (precio — emerald like Clientes zona):
<span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">

// BEFORE (stock):
<span className={`px-2 py-0.5 rounded font-medium ${...}`}>

// AFTER:
<span className={`px-2 py-1 rounded-md text-xs font-medium ${...}`}>

// BEFORE (family):
<span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">

// AFTER (match Clientes zona badge):
<span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">

// BEFORE (category — plain text):
<span className="text-gray-400">

// AFTER (match Clientes categoría badge):
<span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
```

**Step 3: Add Unidad badge** (since we removed it from desktop table, show it in mobile)

After the category badge, add:
```tsx
{product.unit && (
  <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">
    {product.unit}
  </span>
)}
```

**Step 4: Verify visually** — check mobile viewport (< 640px)

---

### Task 4: Tour Attribute — Import/Export Dropdown

**Files:**
- Modify: `apps/web/src/app/(dashboard)/products/page.tsx:374-405`

**Step 1: Add data-tour to the Import/Export dropdown wrapper**

The `<div className="relative">` wrapper around the dropdown button (around line 374) needs:
```
// BEFORE:
<div className="relative">

// AFTER:
<div className="relative" data-tour="products-import-export">
```

---

### Task 5: Commit & Verify

**Step 1: Run Playwright visual-audit for Products**

```bash
cd apps/web && npx playwright test visual-audit.spec.ts --project="Desktop Chrome" --grep "Productos"
```

Expected: PASS

**Step 2: Commit**

```bash
git add apps/web/src/app/(dashboard)/products/page.tsx
git commit -m "style: align Products list visual layout with Clients page pattern"
```
