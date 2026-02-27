# Privacy & Legal Compliance Analysis — Handy Suites

> Investigado: Febrero 2026. Para operación en **México** y **Estados Unidos**.

## Estado Actual

- `/privacidad` — 8 secciones (LFPDPPP parcial)
- `/terminos` — 11 secciones
- **0 checkpoints de consentimiento** en la app (ni registro ni login)

---

## 1. Gaps México (LFPDPPP)

| Gap | Severidad | Artículo |
|-----|-----------|----------|
| No hay mecanismo de revocación de consentimiento | ALTA | Art. 8 |
| No hay mecanismo para limitar uso/divulgación | ALTA | Art. 16-VII |
| No hay periodos de retención de datos | MEDIA | Reglamento Art. 40 |
| No hay descripción de medidas de seguridad | MEDIA | Lineamientos Art. 64 |
| No se menciona derecho a queja ante INAI | MEDIA | Art. 45 |
| Identidad del responsable incompleta (falta razón social, RFC, domicilio completo) | MEDIA | Art. 16-I |
| No se especifican países de transferencia (USA) | MEDIA | Reglamento Art. 68 |
| No hay sección de notificación de brechas de datos | MEDIA | Art. 20 |
| No hay periodo de "bloqueo" antes de eliminación en ARCO | BAJA | Art. 26 |
| Cookies: no se listan cookies específicas | BAJA | Lineamientos Art. 34 |
| Plazo de acuse de recibo ARCO (15 días) faltante | BAJA | Art. 32 |

## 2. Gaps Estados Unidos (CCPA/CPRA + 19 leyes estatales)

| Gap | Severidad | Ley |
|-----|-----------|-----|
| No hay categorías de fuentes de información personal | ALTA | CCPA 1798.100(b) |
| No hay aviso "Do Not Sell or Share" | ALTA | CCPA 1798.120 |
| No hay declaración de no-discriminación | ALTA | CCPA 1798.125 |
| No hay derechos específicos de consumidores US | ALTA | CCPA/CPRA |
| No hay versión en inglés del aviso | ALTA | — |
| No hay soporte para Global Privacy Control (GPC) | MEDIA | Regulaciones CPRA |
| No hay procedimiento para agentes autorizados | MEDIA | CCPA |
| No hay periodos de retención por categoría | MEDIA | CPRA |
| No hay aviso de información personal sensible | MEDIA | CPRA 1798.121 |

**Nota especial**: Texas (TDPSA) no tiene umbral mínimo — aplica a CUALQUIER negocio operando en Texas.

## 3. Checkpoints de Consentimiento Necesarios

### Fase 1 (CRÍTICA)
1. **Checkbox en `/register`**: "He leído y acepto el Aviso de Privacidad y los Términos de Servicio" (unchecked por defecto, obligatorio)
2. **Tabla `PolicyAcceptances`**: user_id, document_type, document_version, accepted_at, ip_address, user_agent
3. **Tabla `PolicyVersions`**: document_type, version, effective_date, content_hash

### Fase 2 (ALTA)
4. **Re-aceptación en login**: Detectar versión desactualizada → modal "Hemos actualizado..."
5. **Cookie consent banner**: Esencial / Analytics / Marketing (granular opt-in)
6. **Marketing opt-in separado**: Checkbox adicional en registro y perfil

### Fase 3 (MEDIA)
7. **Autoservicio exportar datos**: Botón "Descargar mis datos" en Settings
8. **Autoservicio eliminar cuenta**: Con confirmación y periodo de 30 días
9. **Consentimiento AI**: Al activar el add-on de IA

## 4. Documentos Adicionales Necesarios

| Documento | Prioridad |
|----------|-----------|
| Privacy Notice en inglés | ALTA (US) |
| CCPA/US Privacy Addendum | ALTA (US) |
| Data Processing Agreement (DPA) template | ALTA (B2B) |
| Cookie Policy dedicada | MEDIA |
| Lista de sub-procesadores (Railway, Vercel, SendGrid) | MEDIA |
| Calendario de retención de datos | MEDIA |
| GDPR Addendum | BAJA (futuro) |
| Security Practices page | BAJA |

## 5. Términos de Servicio — Gaps para US

- Agregar cláusula de arbitraje (AAA) para usuarios US
- Agregar class action waiver
- Agregar Export Controls / OFAC sanctions compliance
- Agregar DMCA notice (básico)
- Especificar retención fiscal SAT (5 años por CFF Art. 30)
- Separar ley aplicable: México para MX, estado aplicable para US

## 6. Schema de BD Requerido

```sql
-- Aceptaciones de políticas
CREATE TABLE policy_acceptances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  tenant_id INT NOT NULL,
  document_type VARCHAR(20) NOT NULL, -- 'privacy', 'terms', 'cookies', 'marketing'
  document_version VARCHAR(20) NOT NULL,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  revoked_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- Versiones de documentos legales
CREATE TABLE policy_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_type VARCHAR(20) NOT NULL,
  version VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,
  content_hash VARCHAR(64),
  summary_of_changes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Solicitudes de derechos (ARCO / CCPA)
CREATE TABLE data_subject_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT,
  requester_email VARCHAR(255) NOT NULL,
  request_type VARCHAR(30) NOT NULL, -- 'access', 'rectification', 'deletion', 'opposition', 'portability', 'opt-out'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME NULL,
  completed_at DATETIME NULL,
  response_notes TEXT,
  assigned_to INT NULL
);
```

## 7. DPAs Necesarios

Handy Suites necesita DPAs con:
1. Railway (hosting/DB)
2. Vercel (frontend CDN)
3. SendGrid (email)
4. PAC (facturación SAT)
5. Procesador de pagos (futuro)
6. Google (OAuth)
7. OpenAI/Azure OpenAI (cuando AI gateway se despliegue)

---

> **Recomendación**: Consultar con abogado especialista en protección de datos (México) y privacy counsel (US) antes de publicar las versiones finales.
