# Plan 003: Calcular `TotalImpuestosTrasladados` del CFDI desde el mismo desglose, para evitar rechazo SAT CFDI40135

> **Executor instructions**: Sigue este plan paso a paso. Corre cada verificación
> antes de avanzar. Si ocurre algo de "STOP conditions", detente y reporta. Al
> terminar, actualiza la fila de este plan en `plans/README.md`.
>
> **Drift check (primero)**: `git diff --stat 3fa3ba1d..HEAD -- apps/billing/HandySuites.Billing.Api/Services/CfdiXmlBuilder.cs`
> Si el archivo cambió, compara contra los excerpts de "Current state" antes de proceder.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug (compliance)
- **Planned at**: commit `3fa3ba1d`, 2026-06-13

## Why this matters

En el XML del CFDI, el atributo `TotalImpuestosTrasladados` del nodo `<Impuestos>` se escribe desde un valor **guardado** en la factura, mientras que el **desglose** `<Traslado>` se re-agrega sumando los impuestos por concepto (con redondeo a 2 decimales por línea). Cuando la factura tiene varias líneas, el total guardado (calculado a nivel pedido) y la suma del desglose (redondeada por línea) pueden diferir por uno o más centavos. El SAT valida que el total del header sea igual a la suma del desglose y, si no cuadran, **rechaza el comprobante con error CFDI40135**. El caso más expuesto es `CreateFacturaFromOrder`, donde la factura no tiene registros `ImpuestoFactura` y el builder genera el IVA 16% por línea desde los detalles.

## Current state

- `apps/billing/HandySuites.Billing.Api/Services/CfdiXmlBuilder.cs` — construye el XML CFDI. Método `WriteImpuestosTotales` (líneas ~240-301):

```csharp
private void WriteImpuestosTotales(XmlWriter w, Factura factura)
{
    if (factura.TotalImpuestosTrasladados == 0 && factura.TotalImpuestosRetenidos == 0)
        return;

    // Junta los impuestos por concepto (misma lógica que WriteConceptoImpuestos)
    var allTaxes = new List<ImpuestoFactura>();
    if (factura.Impuestos != null && factura.Impuestos.Count > 0)
    {
        allTaxes.AddRange(factura.Impuestos);
    }
    else
    {
        // Genera IVA 16% por concepto si no hay impuestos explícitos (caso from-order)
        var detalles = factura.Detalles?.Where(d => d.ObjetoImp == "02").ToList() ?? new();
        foreach (var d in detalles)
        {
            var baseImporte = d.Importe - d.Descuento;
            allTaxes.Add(new ImpuestoFactura
            {
                Tipo = "TRASLADO", Impuesto = "002", TipoFactor = "Tasa", TasaOCuota = 0.160000m,
                Base = baseImporte,
                Importe = Math.Round(baseImporte * 0.16m, 2, MidpointRounding.ToEven)
            });
        }
    }

    w.WriteStartElement("cfdi", "Impuestos", CfdiNamespace);

    if (factura.TotalImpuestosRetenidos > 0)
        w.WriteAttributeString("TotalImpuestosRetenidos", FormatDecimal(factura.TotalImpuestosRetenidos)); // <-- valor guardado

    if (factura.TotalImpuestosTrasladados > 0)
        w.WriteAttributeString("TotalImpuestosTrasladados", FormatDecimal(factura.TotalImpuestosTrasladados)); // <-- valor guardado

    // Desglose: agrega traslados por (Impuesto, TipoFactor, TasaOCuota)
    var allTraslados = allTaxes
        .Where(i => i.Tipo == "TRASLADO")
        .GroupBy(i => new { i.Impuesto, i.TipoFactor, i.TasaOCuota })
        .ToList();
    if (allTraslados.Count > 0)
    {
        w.WriteStartElement("cfdi", "Traslados", CfdiNamespace);
        foreach (var group in allTraslados)
        {
            w.WriteStartElement("cfdi", "Traslado", CfdiNamespace);
            w.WriteAttributeString("Base", FormatDecimal(group.Sum(g => g.Base)));
            w.WriteAttributeString("Impuesto", group.Key.Impuesto);
            w.WriteAttributeString("TipoFactor", group.Key.TipoFactor);
            if (group.Key.TipoFactor != "Exento")
            {
                w.WriteAttributeString("TasaOCuota", FormatDecimal(group.Key.TasaOCuota ?? 0, 6));
                w.WriteAttributeString("Importe", FormatDecimal(group.Sum(g => g.Importe ?? 0)));  // <-- desglose sumado
            }
            w.WriteEndElement();
        }
        w.WriteEndElement();
    }
    // ... (puede haber un bloque de Retenciones análogo más abajo) ...
}
```

- El descuadre: header usa `factura.TotalImpuestosTrasladados` (guardado a nivel pedido), desglose usa `Sum(group.Sum(g => g.Importe))` (redondeado por línea). Para ≥2 líneas pueden diferir.
- `FormatDecimal(value, decimals=2)` redondea a 2 decimales con `MidpointRounding.ToEven` (definido al final del archivo). Importes y totales se escriben a 2 decimales.
- Hay un fix relacionado ya en el repo (commit reciente CFDI40167): `ValorUnitario` neto en `FacturasController` — confirma que el ValorUnitario/Importe por concepto son pre-impuestos. Este plan no toca eso.

## Commands you will need

| Propósito | Comando | Esperado |
|-----------|---------|----------|
| Tests billing | `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` | exit 0 |
| Rebuild billing | `docker-compose -f docker-compose.dev.yml up -d --build api_billing` | sano (requiere `CLOUDINARY_URL`) |

## Scope

**In scope**:
- `apps/billing/HandySuites.Billing.Api/Services/CfdiXmlBuilder.cs` (solo el bloque `<Impuestos>` en `WriteImpuestosTotales`; revisar también el bloque de Retenciones del mismo método si existe, para el mismo tratamiento)
- `apps/billing/HandySuites.Billing.Tests/Services/` (test nuevo/extendido)

**Out of scope**:
- El cálculo de `factura.Subtotal`, `factura.Total`, ni cómo se setea `factura.TotalImpuestosTrasladados` aguas arriba (en `FacturasController`/`OrderReader`). Solo se cambia **qué valor se escribe** en el XML, no cómo se calcula la factura.
- `WriteConceptoImpuestos` (impuestos por concepto a nivel `<Concepto>`) — no se modifica salvo que el reviewer confirme un descuadre análogo concepto-vs-total; en ese caso, sigue el mismo principio (la suma de los importes por concepto debe ser la fuente de verdad).

## Git workflow

- Rama: `advisor/003-cfdi-total-impuestos-desglose`
- Commit: `fix(billing): TotalImpuestosTrasladados del CFDI se calcula del desglose para evitar CFDI40135`. Sin `Co-Authored-By` ni mención de IA.

## Steps

### Step 1: Escribir el total del header desde la suma del desglose

Antes de escribir el atributo `TotalImpuestosTrasladados`, calcula la suma desde `allTaxes` (la misma colección que alimenta el desglose):

```csharp
var totalTrasladado = allTaxes.Where(i => i.Tipo == "TRASLADO").Sum(i => i.Importe ?? 0);
var totalRetenido   = allTaxes.Where(i => i.Tipo == "RETENCION").Sum(i => i.Importe ?? 0);

// Warning si difiere del valor guardado aguas arriba (señal de descuadre, sin bloquear timbrado):
if (Math.Abs(totalTrasladado - factura.TotalImpuestosTrasladados) > 0.01m)
    _logger.LogWarning("CFDI {Serie}-{Folio}: TotalImpuestosTrasladados guardado={Guardado} vs desglose={Desglose}",
        factura.Serie, factura.Folio, factura.TotalImpuestosTrasladados, totalTrasladado);
```

Luego escribe los atributos del header usando los valores calculados, NO los guardados:

```csharp
if (totalRetenido > 0)
    w.WriteAttributeString("TotalImpuestosRetenidos", FormatDecimal(totalRetenido));
if (totalTrasladado > 0)
    w.WriteAttributeString("TotalImpuestosTrasladados", FormatDecimal(totalTrasladado));
```

Nota: revisa si `CfdiXmlBuilder` tiene un `ILogger` inyectado; si no, omite el `LogWarning` (no agregues una dependencia nueva solo para esto — el fix principal es usar `totalTrasladado` calculado).

**Verify**: `dotnet build apps/billing/HandySuites.Billing.Api/HandySuites.Billing.Api.csproj` → exit 0.

### Step 2: Aplicar el mismo principio al bloque de Retenciones si existe

Si más abajo en el mismo método hay un bloque `<Retenciones>` que escribe `TotalImpuestosRetenidos` desde el valor guardado, cámbialo para usar `totalRetenido` calculado en Step 1. Si no hay retenciones en este sistema (es un CRM de ventas, normalmente solo traslados de IVA), deja el bloque como está pero asegúrate de que el header use el valor calculado.

**Verify**: leer el método completo y confirmar que ningún atributo `TotalImpuestos*` del nodo `<Impuestos>` usa ya `factura.TotalImpuestos*` directo.

## Test plan

- Test nuevo en `apps/billing/HandySuites.Billing.Tests/Services/CfdiXmlBuilderTests.cs` (crear si no existe; modelar sobre tests de builder existentes):
  - **Caso de regresión**: una `Factura` con `factura.Impuestos` vacío y **3+ detalles** cuyos importes producen un descuadre por redondeo entre el total-pedido y la suma-por-línea. Construir el XML y assert: el atributo `TotalImpuestosTrasladados` del nodo `<Impuestos>` es **igual** a la suma de los atributos `Importe` de los `<Traslado>` hijos.
  - **Caso simple**: factura de 1 línea — el total sigue cuadrando (no regresión).
- Verificación: `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` → todos pasan, incluido el nuevo.
- **Prueba end-to-end (manual, recomendada)**: rebuild billing, y por la UI web timbrar en sandbox Finkok un **pedido de ≥3 líneas** con el emisor de pruebas IVD920810GU2 (receptor ICV060329BY0). Esperado: UUID timbrado sin error CFDI40135.

## Done criteria

ALL deben cumplirse:

- [ ] `dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj` exit 0, con un test nuevo que verifica header == suma del desglose
- [ ] En `WriteImpuestosTotales`, los atributos `TotalImpuestosTrasladados`/`TotalImpuestosRetenidos` del nodo `<Impuestos>` se calculan desde `allTaxes`, no desde `factura.TotalImpuestos*`
- [ ] No se modificó nada fuera del scope (`git status`)
- [ ] Fila de este plan actualizada en `plans/README.md`

## STOP conditions

Detente y reporta si:

- El código de `WriteImpuestosTotales` no coincide con el excerpt (drift desde `3fa3ba1d`).
- Resulta que `factura.Impuestos` SÍ se puebla siempre (no solo en `CreateFactura`) — entonces verifica que la suma de `factura.Impuestos.Importe` ya cuadra con `factura.TotalImpuestosTrasladados` y el descuadre venía de otro lado; reporta antes de cambiar.
- Algún test existente esperaba el valor guardado y ahora falla **por una diferencia mayor a 0.01** (no un centavo de redondeo) — eso indica que el valor guardado y el real divergen de verdad; reporta en vez de "ajustar" el test a ciegas.

## Maintenance notes

- Principio a preservar: **el header de impuestos siempre se deriva del desglose**, nunca de un total calculado por separado. Cualquier cambio futuro en el armado de impuestos debe mantener esa invariante.
- El reviewer debe correr (o pedir) un timbrado real de factura multi-línea en sandbox como prueba de aceptación; los unit tests cubren la aritmética, pero el SAT es el juez final.
- Plan 004 (ObjetoImp por producto) toca el mismo método (`d.ObjetoImp == "02"` en la rama `else`) — ejecutar 003 antes de 004.
