# Política de Impersonación de Cuentas - HandySales

**Versión:** 1.0
**Fecha:** 2026-01-30
**Estado:** Activo

---

## 1. Definición

La **impersonación** es la capacidad de un administrador de plataforma (SUPER_ADMIN) de acceder temporalmente a la cuenta de un tenant (empresa cliente) para propósitos específicos de soporte, diagnóstico o cumplimiento legal.

---

## 2. Marco Legal Aplicable

### 2.1 Legislación Mexicana

| Ley | Artículos Relevantes | Aplicación |
|-----|---------------------|------------|
| **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)** | Arts. 6, 8, 9 | Consentimiento para tratamiento de datos |
| **Reglamento de la LFPDPPP** | Arts. 14, 15 | Medidas de seguridad y confidencialidad |
| **Código de Comercio** | Arts. 89-94 | Mensajes de datos y firma electrónica |
| **Ley Federal de Protección al Consumidor** | Art. 76 bis | Transparencia en servicios digitales |

### 2.2 Estándares Internacionales

- **ISO 27001** - Seguridad de la información
- **SOC 2 Type II** - Controles de acceso y auditoría
- **GDPR** (para clientes con operaciones en UE) - Arts. 6, 32

---

## 3. Principios Rectores

### 3.1 Transparencia
- Los clientes son informados de esta capacidad en los **Términos de Servicio**
- El Aviso de Privacidad menciona el acceso administrativo como parte del tratamiento

### 3.2 Proporcionalidad
- Solo se accede a la información **estrictamente necesaria**
- El acceso es **temporal** y con **duración limitada**

### 3.3 Trazabilidad
- **Toda** sesión de impersonación queda registrada
- Los registros son **inmutables** y se conservan por **5 años**

### 3.4 Minimización
- Preferencia por acceso de **solo lectura**
- Acceso de escritura solo con justificación adicional

---

## 4. Casos de Uso Autorizados

| Caso | Justificación | Nivel de Acceso | Aprobación Requerida |
|------|---------------|-----------------|---------------------|
| **Soporte Técnico** | Cliente reporta error, necesita diagnóstico | Solo lectura | Ticket de soporte |
| **Debugging** | Error crítico afectando al cliente | Solo lectura | Ticket + Supervisor |
| **Onboarding** | Ayuda en configuración inicial | Lectura/Escritura | Consentimiento verbal |
| **Migración de Datos** | Importación masiva autorizada | Lectura/Escritura | Contrato firmado |
| **Requerimiento Legal** | SAT, autoridades judiciales | Solo lectura | Documento oficial |
| **Auditoría Interna** | Verificación de cumplimiento | Solo lectura | Director de Operaciones |

### 4.1 Casos **NO** Autorizados

- Curiosidad o interés personal
- Inteligencia competitiva
- Acceso sin justificación documentada
- Modificación de datos sin autorización explícita

---

## 5. Procedimiento de Impersonación

### 5.1 Antes de Impersonar

```
1. Verificar que existe justificación válida
2. Documentar la razón en el sistema (obligatorio)
3. Ingresar número de ticket o referencia (si aplica)
4. Confirmar que el acceso es proporcional al objetivo
```

### 5.2 Durante la Sesión

```
1. Sesión máxima: 60 minutos (renovable con nueva justificación)
2. Todas las acciones son registradas automáticamente
3. Banner visible indica "Sesión de Soporte Activa"
4. No descargar datos a dispositivos personales
```

### 5.3 Después de la Sesión

```
1. Cerrar sesión explícitamente (no abandonar)
2. Documentar hallazgos en el ticket correspondiente
3. Sistema envía notificación automática al ADMIN del tenant
```

---

## 6. Registro de Auditoría (Audit Log)

### 6.1 Datos Capturados

| Campo | Descripción | Retención |
|-------|-------------|-----------|
| `session_id` | Identificador único de sesión | 5 años |
| `super_admin_id` | Quién realizó la impersonación | 5 años |
| `super_admin_email` | Email del administrador | 5 años |
| `tenant_id` | Tenant impersonado | 5 años |
| `tenant_name` | Nombre de la empresa | 5 años |
| `reason` | Justificación documentada | 5 años |
| `ticket_number` | Referencia de ticket (opcional) | 5 años |
| `started_at` | Inicio de sesión (UTC) | 5 años |
| `ended_at` | Fin de sesión (UTC) | 5 años |
| `ip_address` | IP del administrador | 5 años |
| `user_agent` | Navegador/dispositivo | 5 años |
| `access_level` | `READ_ONLY` o `READ_WRITE` | 5 años |
| `actions_performed` | Lista de acciones realizadas | 5 años |
| `pages_visited` | Rutas accedidas | 5 años |

### 6.2 Inmutabilidad

- Los registros de auditoría **NO pueden ser editados ni eliminados**
- Se almacenan en tabla separada con permisos restringidos
- Backup automático a almacenamiento externo

---

## 7. Notificación al Cliente

### 7.1 Notificación Automática

Después de cada sesión de impersonación, el sistema envía automáticamente:

**Asunto:** Acceso de Soporte a tu cuenta - HandySales

**Contenido:**
```
Hola [Nombre del ADMIN],

Te informamos que un miembro de nuestro equipo de soporte accedió
a la cuenta de [Nombre Empresa] el día [Fecha] a las [Hora].

Detalles:
- Motivo: [Razón documentada]
- Ticket de referencia: [Número si aplica]
- Duración: [X minutos]
- Tipo de acceso: [Solo lectura / Lectura y escritura]

Este acceso fue realizado de acuerdo con nuestros Términos de Servicio
y Política de Privacidad para brindarte un mejor soporte.

Si tienes preguntas sobre este acceso, responde a este correo o
contacta a soporte@handysales.com

Saludos,
Equipo HandySales
```

### 7.2 Excepciones a la Notificación

- Requerimientos legales que prohíban notificación (orden judicial)
- Investigaciones de fraude en curso

---

## 8. Sanciones por Incumplimiento

### 8.1 Para Empleados de HandySales

| Infracción | Primera Vez | Reincidencia |
|------------|-------------|--------------|
| Acceso sin justificación | Amonestación escrita | Suspensión |
| Descarga no autorizada de datos | Suspensión | Terminación |
| Compartir información con terceros | Terminación inmediata | Acción legal |
| Manipulación de logs | Terminación + Acción legal | N/A |

### 8.2 Reporte de Incidentes

Los clientes pueden reportar uso indebido a:
- **Email:** privacidad@handysales.com
- **Teléfono:** [Número de contacto]
- **INAI:** Si consideran violación a la LFPDPPP

---

## 9. Derechos ARCO del Cliente

Los clientes pueden ejercer sus derechos de:
- **A**cceso - Solicitar logs de impersonación de su cuenta
- **R**ectificación - N/A (logs son inmutables)
- **C**ancelación - Solicitar eliminación de su cuenta completa
- **O**posición - Solicitar desactivación de impersonación (plan Enterprise)

---

## 10. Términos de Servicio (Extracto)

> **Sección X.X - Acceso Administrativo**
>
> El Cliente reconoce y acepta que HandySales, a través de personal
> autorizado, podrá acceder a la cuenta del Cliente para:
>
> a) Brindar soporte técnico solicitado por el Cliente
> b) Diagnosticar y resolver problemas técnicos
> c) Cumplir con requerimientos legales de autoridades competentes
> d) Realizar auditorías de seguridad y cumplimiento
>
> Dicho acceso será:
> - Documentado y auditable
> - Limitado en tiempo y alcance
> - Notificado al Cliente (salvo impedimento legal)
> - Realizado bajo estrictas políticas de confidencialidad
>
> El Cliente podrá solicitar el registro de accesos administrativos
> a su cuenta en cualquier momento.

---

## 11. Aviso de Privacidad (Extracto)

> **Transferencias y Acceso a Datos**
>
> Para la prestación del servicio, personal autorizado de HandySales
> podrá acceder a los datos almacenados en su cuenta con fines de:
>
> - Soporte técnico
> - Mantenimiento del sistema
> - Cumplimiento regulatorio
>
> Este acceso se realiza bajo controles de seguridad que incluyen:
> autenticación de dos factores, registro de auditoría inmutable,
> y políticas de mínimo privilegio.

---

## 12. Historial de Cambios

| Versión | Fecha | Cambios | Autor |
|---------|-------|---------|-------|
| 1.0 | 2026-01-30 | Versión inicial | HandySales |

---

## 13. Aprobaciones

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| CEO | _________________ | _______ | _______ |
| CTO | _________________ | _______ | _______ |
| Legal | _________________ | _______ | _______ |
| DPO | _________________ | _______ | _______ |

---

**Documento Confidencial - Uso Interno y para Clientes**
