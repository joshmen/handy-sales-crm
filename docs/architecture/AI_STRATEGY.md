# AI Add-on Strategy (apps/ai/)

> Extracted from CLAUDE.md — full AI gateway architecture, pricing, and implementation plan.

## Packs Vendibles

| Pack | Features | Target | Rango MXN/mes |
|------|----------|--------|---------------|
| Ventas | Cross-sell, reorder predictions, visit priority, client scoring | Admin + Vendedor | $299-499 |
| Cobranza | Risk scoring, personalized collection messages, payment probability | Admin | $199-399 |
| Automatizacion | Visit summaries, semantic search, OCR de evidencia, daily digest | Admin + Vendedor | $249-449 |
| Inteligencia | Anomaly detection, sales forecasting, territory optimization | Admin | $399-699 |
| Todo-en-uno | Todos los packs | Admin | $899-1,499 (20% desc.) |

## Modelo de Creditos

```
1 credit = 1 AI request (varia por complejidad)

Costos por operacion:
  Simple (summary, classification)     = 1 credito
  Medium (recommendations, scoring)    = 2 creditos
  Complex (RAG search, OCR)            = 3 creditos
  Heavy (forecasting, batch analysis)  = 5 creditos

Asignaciones mensuales:
  Ventas: 500 | Cobranza: 300 | Automatizacion: 400
  Inteligencia: 200 | Todo-en-uno: 1,200

Sobrecargos: $0.50 MXN por credito adicional
Sin acumulacion (use it or lose it)
```

## Metricas Vendibles (ROI dashboard)

| Metrica | Como la IA la mejora |
|---------|---------------------|
| Ticket promedio | Cross-sell aumenta items por pedido |
| Cartera vencida | Risk scoring + mensajes automaticos reducen mora |
| Tiempo por visita | Auto-summaries + smart routing ahorran tiempo |
| Tasa de recompra | Reorder predictions disparan follow-ups oportunos |
| Anomalias detectadas | Detectar patrones inusuales antes de que sean perdidas |

## AI Architecture

```
Frontend/Mobile → /api/ai/* → AI Gateway → Auth+JWT → Rate Limiter → Router
                                              ↓
                                   ┌──────────┴──────────┐
                                   │                     │
                              LLM Call             Tool Call
                         (OpenAI/Azure)       (internal APIs)
                                   │                     │
                                   └──────────┬──────────┘
                                              │
                                     Vector Store (RAG)
                                     pgvector, partitioned
                                     by tenant_id
                                              │
                                     Usage Tracking + Audit
                                     AiUsage, AiCredits tables
```

## apps/ai/ Structure

```
apps/ai/src/HandySales.Ai.Api/
├── Endpoints/          # Summary, Recommendation, Collections, Document, Search, Usage
├── Middleware/          # RateLimit, CreditDeduction, FeatureFlag
├── Services/           # LlmRouter, ToolCallExecutor, RagService, CreditManager, ResponseCache
├── Configuration/
└── Program.cs
```

## Endpoints (Port 1053)

| Endpoint | Method | Creditos | Pack |
|----------|--------|----------|------|
| /api/ai/recommendations | POST | 2 | Ventas |
| /api/ai/visit-priority | POST | 2 | Ventas |
| /api/ai/client-score | POST | 2 | Ventas |
| /api/ai/collections-message | POST | 1 | Cobranza |
| /api/ai/collections-risk | POST | 2 | Cobranza |
| /api/ai/summary | POST | 1 | Automatizacion |
| /api/ai/search | POST | 3 | Automatizacion |
| /api/ai/document-extract | POST | 3 | Automatizacion |
| /api/ai/anomalies | POST | 5 | Inteligencia |
| /api/ai/forecast | POST | 5 | Inteligencia |
| /api/ai/usage | GET | 0 | All |

## Data Schema (tablas nuevas en handy_erp)

- `AiPlans` — definiciones de packs (nombre, slug, precio, creditos, features JSON)
- `AiSubscriptions` — suscripcion activa del tenant (tenant_id, plan_id, fecha_inicio)
- `AiCreditBalances` — creditos por tenant por mes (asignados, usados, extras)
- `AiUsage` — log por request (tenant, user, endpoint, model, tokens, costo, latency, cache_hit)
- `AiAuditLogs` — audit trail completo (accion, detalle JSON, IP)

## Security & Compliance

- **Aislamiento multi-tenant**: WHERE tenant_id en todo, vector store filtrado por metadata
- **JWT compartido**: misma clave que Main/Mobile APIs
- **Feature flags**: middleware verifica AiSubscriptions, 403 si no tiene pack
- **Rate limiting**: por tenant por minuto segun plan
- **Creditos**: middleware verifica balance, 402 si agotado
- **PII**: nunca enviar telefono/email/RFC al LLM, usar IDs anonymizados
- **Audit**: cada request logueado con tenant, user, endpoint, model, tokens, costo

## LLM Model Selection

| Tarea | Modelo | Razon |
|-------|--------|-------|
| Summaries, classifications | gpt-4o-mini | Rapido, barato, calidad suficiente |
| Recommendations, scoring | gpt-4o-mini | Buen razonamiento a bajo costo |
| RAG, anomaly detection | gpt-4o | Requiere reasoning mas fuerte |
| Embeddings | text-embedding-3-small | El mas barato, 1536 dims |
| OCR / documents | gpt-4o (vision) | Requiere input multimodal |

**Controles de costo**: caching de respuestas identicas (TTL 1h), model routing automatico, queue para OCR, limites de tokens por request.

## RAG por Tenant

- **Vector store**: pgvector en Railway PostgreSQL (~$5/mes)
- **Documentos indexados**: notas de visitas, notas de pedidos, descripciones de productos
- **Pipeline**: entity create/update → enqueue embedding → text-embedding-3-small → store vector + tenant_id metadata
- **Aislamiento**: MANDATORY filter por tenant_id en toda busqueda

## Tool Calling

- `get_client_info(clienteId)` → GET /api/clients/{id}
- `get_client_orders(clienteId, days)` → GET /api/orders?clienteId={id}
- `get_overdue_portfolio(tenantId)` → GET /api/cobranza/vencida
- Service-to-service JWT interno, hereda tenant_id del request original

## AI Roadmap

| Fase | Foco | Timeline |
|------|------|----------|
| 1. Quick Wins | /summary + /collections-message | 2-3 semanas |
| 2. Recommendations | /recommendations + /visit-priority + credit system | 3-4 semanas |
| 3. RAG & Search | pgvector + /search + /document-extract | 4-6 semanas |
| 4. Intelligence | /anomalies + /forecast + admin dashboard | 4-6 semanas |

## Cost Estimate

| Componente | Costo/mes |
|------------|-----------|
| AI Gateway container (Railway) | $5-10 |
| PostgreSQL pgvector (Railway) | $5-7 |
| OpenAI API (50 tenants avg) | $20-80 |
| Embeddings | $5-15 |
| **Total AI infra** | **$35-112** |
| **Revenue (10 tenants x $500 MXN)** | **~$280 USD** |
