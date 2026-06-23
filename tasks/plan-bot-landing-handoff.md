# Bot de landing con handoff a asesor — Plan (proyectos separados, boilerplate)

> Guardado: 2026-06-18. Entrega advisory + plan (sin implementar). Basado en deep research de 6 agentes (jun 2026).

## Context
El fundador quiere un bot en la **landing pública** que responda dudas (FAQ/precios) y derive a un
**asesor humano** cuando haga falta. Decisiones del usuario ya tomadas:
- **Mismo stack**: Next.js (frontend) + .NET (backend).
- **Proyectos SEPARADOS** ("no quiero revolver todo"): el backend .NET queda como **boilerplate**
  autónomo; el widget como app Next.js aparte embebida en la landing con una línea.

Hallazgos del repo que motivan la separación:
- La landing hoy vive MEZCLADA en `apps/web` (`apps/web/src/app/page.tsx` + `components/landing/`),
  junto al dashboard autenticado.
- **No existe `apps/ai`**: el RAG está en `libs/` (`AiGatewayService`, `AiEmbeddingService` con pgvector)
  y sus endpoints viven DENTRO del Main API (`apps/api`, 1050). Ese RAG es **autenticado, multi-tenant
  y consume créditos** sobre datos de negocio del tenant — NO sirve tal cual para un bot **público/anónimo**
  de marketing. Por eso el bot va como servicio separado que solo **reutiliza el patrón** (copia), no la infra.

## Arquitectura (2 proyectos nuevos)
```
Landing (apps/web, casi sin tocar)
   └─ 1 línea: <script>/iframe que carga el widget
        │
        ▼
apps/chat-widget  (NUEVO · Next.js 15 + React 19 + Vercel AI SDK)  → deploy Vercel propio
   └─ UI flotante (useChat), proxy/stream  →  llama al backend
        │
        ▼
apps/chatbot  (NUEVO · .NET 8 · BOILERPLATE autónomo · puerto 1054) → Railway propio
   ├─ RAG público sobre KB del PRODUCTO (no datos de tenant, sin créditos, sin JWT en el chat público)
   ├─ OpenAI gpt-4o-mini + embeddings text-embedding-3-small (cliente propio)
   ├─ Guardrails (responde solo desde contexto / abstención), precios vía tool con cita
   ├─ Handoff (tool escalar_a_asesor → crea lead + notifica)
   └─ Webhook WhatsApp (Fase 2)
        │
        ▼
DB handy_chat  (NUEVA · misma instancia PostgreSQL + pgvector)
   └─ kb_documents, kb_embeddings(vector), conversations, messages, leads
```

## Backend: `apps/chatbot` (.NET 8, boilerplate autónomo)
- **Autocontenido**: su propio `DbContext` mínimo, su propia DB `handy_chat`, su propio cliente OpenAI.
  NO referencia `libs/HandySuites.Infrastructure` (evita arrastrar todo el DbContext del ERP). Estructura
  limpia tipo plantilla: `Endpoints/`, `Services/`, `Data/`, `Models/`, `Program.cs`.
- **Reutiliza el PATRÓN probado** (copiar ~100 líneas, no acoplar): búsqueda pgvector por distancia coseno
  de `AiEmbeddingService.cs` y la inyección de contexto + llamada OpenAI de `AiGatewayService.cs`.
- **Endpoints públicos** (rate-limited, sin JWT): `POST /chat` (respuesta + fuentes + señal de handoff,
  streaming SSE), `POST /handoff`, `GET|POST /whatsapp/webhook`; e interno `POST /kb/ingest` (carga KB).
- **RAG**: KB = contenido de marketing/producto/precios (una sola base, NO multi-tenant). Precios servidos
  desde fuente única vía tool/function-call con **cita obligatoria** (nunca dejar que el modelo invente).
  Guardrail "responde SOLO con el contexto"; si no hay soporte → abstención + handoff.
- **Mejora**: retrieval **híbrido** (pgvector + full-text/BM25 de Postgres con Reciprocal Rank Fusion)
  sube precision ~0.61→0.71-0.79, sin infra nueva.
- **Patrón de servicio a clonar**: `apps/mobile`/`apps/api` (Program.cs, Serilog, Swagger), Dockerfile,
  entrada en `docker-compose.dev.yml` (puerto 1054), paso en `.github/workflows/deploy-apis.yml`
  (path-filter `apps/chatbot/**`). Migración pgvector de referencia:
  `libs/HandySuites.Infrastructure/Migrations/20260309082723_AddPgvectorEmbeddings.cs`.

## Frontend: `apps/chat-widget` (Next.js 15, app separada)
- App independiente con la UI del chat flotante (`useChat` de `@ai-sdk/react`; UI acelerada con
  `assistant-ui` o `shadcn-chatbot-kit`). Streaming consumido del backend (vía thin Route Handler
  `/api/chat` para CORS/origin, o consumo SSE directo).
- **Embebido en la landing con UNA línea** (script/iframe, estilo Crisp/Intercom) en el layout/landing
  de `apps/web` — `apps/web` casi no se toca. Deploy y versionado del widget independientes en Vercel.
- Visitante anónimo, sin fricción (no pide teléfono al entrar). Embeber sin degradar Core Web Vitals.

## Diseño del handoff (modelo híbrido)
Cinco disparadores combinados: (1) **explícito** (botón permanente + NLP "hablar con una persona"),
(2) **baja confianza** (~0.65 combinado = 40% retrieval + 60% generación, o 2-3 intentos fallidos),
(3) **intención de compra** — clave en preventa: "precios"/"demo" = señal caliente → ofrecer asesor o
agendar proactivamente (lead contactado <5 min convierte mucho más), (4) **frustración**, (5)
**conversación larga**. La tool `escalar_a_asesor` arma un **handoff packet** (resumen 2-3 frases del
propio RAG + intent + snippets KB + sentimiento + razón + contacto), crea el lead en `handy_chat`
(con consentimiento) y notifica al asesor. Verificar disponibilidad/horario ANTES de prometer humano.
**Fuera de horario nunca perder el lead**: capturar datos + callback (Calendly) o formulario, con SLA.

## WhatsApp — SÍ, "inbound-first"
México ~93% penetración; botón Click-to-WhatsApp casi obligatorio. Desde jul-2025 Meta cobra por mensaje;
las conversaciones de **servicio iniciadas por el cliente son gratis e ilimitadas** (y el texto libre +
plantillas de utilidad dentro de la ventana 24h). Como el visitante siempre inicia, el bot opera casi
siempre gratis; solo pagas al reenganchar fuera de ventana (~0.03 USD marketing / ~0.0085 utilidad, base
Meta). **Cómo**: Meta **Cloud API directo** (0 markup) al webhook de `apps/chatbot`; escalar a 360dialog
(~49 EUR/mes passthrough) si hay múltiples números. Evitar Wati (+20%)/respond.io (duplican el motor IA).
Requisitos: número dedicado, WABA en Meta Business Manager, Business Verification, display name aprobado.
El rate card de Meta cambia cada trimestre — verificar en su calculadora oficial antes de fijar cifras.

## Plan por fases
- **Fase 0 — Scaffolding + KB + cumplimiento (3-5 días)**: crear `apps/chatbot` (boilerplate .NET) +
  `apps/chat-widget` (Next.js) + DB `handy_chat` (migración pgvector). Curar KB de FAQ/producto y precios
  (fuente única). Aviso de privacidad LFPDPPP (datos tratados, fines necesarios vs voluntarios) + checkbox
  de consentimiento antes de capturar datos. Documentar a OpenAI como encargado.
- **Fase 1 — MVP (1-2 semanas)**: backend `POST /chat` con RAG + guardrail/abstención + `POST /kb/ingest`;
  widget embebido en la landing con 1 línea. Handoff v1: tool `escalar_a_asesor` → lead en `handy_chat`
  + notificar por email/Slack. Instrumentar desde el día 1 (tokens, latencia, containment/deflection,
  escalation rate, leads). Objetivo: 55-65% containment, 15-30% escalation.
- **Fase 2 — WhatsApp + bandeja (1 semana)**: webhook Meta Cloud API directo + Click-to-WhatsApp +
  Chatwoot self-host como bandeja del asesor (routing, notas) + flag `modo_humano` con TTL ~2h +
  auto-reanudación. Fallback fuera de horario (Calendly/formulario + SLA).
- **Fase 3 — Calidad/conversión**: retrieval híbrido (RRF) + reranking top-20→top-5; warm vs cold transfer;
  handoff packet enriquecido; groundedness con RAGAS en CI; cerrar bucle (context completeness, FCR
  post-handoff, re-contacto 24-48h, delta CSAT).
- **Fase 4 — Costo/modelo (continua)**: evaluar GPT-5 nano (0.05/0.40) / GPT-5 mini (0.25/2.00) o Claude
  Haiku 4.5 (menos alucinación); embeddings Cohere embed-v4 / BGE-M3 si el español flaquea.

## Costo realista
MVP (Fase 1-2), 500-2,000 conversaciones/mes: **~1-6 USD/mes solo tokens** (gpt-4o-mini 0.15/0.60 por 1M;
embeddings 0.02/1M; `handy_chat` en la misma instancia Postgres = ~0 incremental). Vercel del widget:
cuota Hobby/credito Pro. Chatwoot self-host: 0 licencia. WhatsApp inbound-first: casi todo gratis.
**Cabe holgado en el presupuesto 25-40 USD/mes**; el costo real es ingeniería. La vía SaaS costaría
25-95 USD/mes + mensajes Meta y duplicaría el motor de IA.

## Verificación (cuando se construya)
- `dotnet build apps/chatbot` + (si hay tests) `dotnet test`; rebuild del contenedor `api_chatbot`.
- `cd apps/chat-widget && npm run type-check` (0 errores) y arrancar dev.
- Flujo local: KB ingest → FAQ respondida con cita → pregunta de precio servida desde fuente única →
  trigger de handoff (explícito y por intención "demo") → lead creado en `handy_chat` con consentimiento.
- Abstención: set de preguntas fuera de KB debe abstenerse + derivar (no inventar).
- Embeber el widget en una página de prueba de la landing y medir LCP (no degradar Core Web Vitals).
- WhatsApp (Fase 2): webhook GET verify + POST respond contra `apps/chatbot`; flag `modo_humano` con TTL.

## Pre-Push Checklist (cuando aplique)
- Nuevas env vars: `OPENAI_API_KEY` (ya existe), `ConnectionStrings__ChatDb` (handy_chat), WhatsApp
  (`WHATSAPP__VERIFY_TOKEN`, `WHATSAPP__ACCESS_TOKEN`, `WHATSAPP__PHONE_ID`) → avisar a Railway/Vercel.
- Nueva DB `handy_chat` + extensión pgvector a provisionar (local, staging, prod).
- Nuevo servicio Railway (`apps/chatbot`) + nuevo proyecto Vercel (`apps/chat-widget`).
- `deploy-apis.yml`: agregar `apps/chatbot/**` al path-filter (el widget va por Vercel, no por este CI).
- Verificar rama Source de Railway antes de push (staging-first).

## Estado
Plan aprobado como documento. **No** implementado todavía (usuario pidió dejarlo solo como plan).
Próximo paso a su elección: arrancar Fase 0 (scaffolding de los dos proyectos + DB).
