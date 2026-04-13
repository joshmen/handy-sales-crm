namespace HandySuites.Api.Automations;

/// <summary>
/// Centralized localization for automation handler messages, email subjects,
/// section headings, KPI labels, callouts, and footer text.
/// Supports "es" (default) and "en".
/// </summary>
public static class AutomationMessages
{
    public static string Get(string key, string lang) =>
        lang == "en" && English.TryGetValue(key, out var en) ? en
        : Spanish.TryGetValue(key, out var es) ? es
        : key;

    // ─── Email Template ────────────────────────────────────
    private static readonly Dictionary<string, string> Spanish = new()
    {
        // Footer
        ["email.footer1"] = "Este correo fue generado automáticamente por HandySuites.",
        ["email.footer2"] = "Puedes configurar tus notificaciones desde el panel de Automatizaciones.",

        // Stock Bajo
        ["stockBajo.subject"] = "Alerta de Stock Bajo",
        ["stockBajo.heading"] = "Productos que requieren reabastecimiento",
        ["stockBajo.kpi.afectados"] = "Productos afectados",
        ["stockBajo.kpi.sinStock"] = "Sin stock",
        ["stockBajo.kpi.stockBajo"] = "Stock bajo",
        ["stockBajo.notification"] = "productos con stock bajo o sin stock",
        ["stockBajo.result"] = "Alerta enviada: {0} productos con stock bajo",

        // Inventario Crítico
        ["inventarioCritico.subject"] = "Inventario Crítico — Acción Inmediata",
        ["inventarioCritico.heading"] = "Productos sin existencias",
        ["inventarioCritico.kpi.sinStock"] = "Sin stock",
        ["inventarioCritico.kpi.afectados"] = "Productos afectados",
        ["inventarioCritico.callout"] = "Los vendedores no podrán ofrecerlos. Reabastecer lo antes posible.",
        ["inventarioCritico.result"] = "Alerta enviada: {0} productos sin inventario",

        // Resumen Diario
        ["resumenDiario.subject"] = "Resumen del Día",
        ["resumenDiario.noActivity"] = "No se registró actividad comercial hoy. ¿Hay algo que se pueda mejorar para mañana?",
        ["resumenDiario.summary"] = "Se facturaron {0} en {1} pedido{2}",
        ["resumenDiario.topVendors"] = "Top Vendedores del Día",
        ["resumenDiario.topClients"] = "Top Clientes del Día",
        ["resumenDiario.notification"] = "Tu resumen del día está listo. Te lo enviamos por correo.",
        ["resumenDiario.result"] = "Resumen enviado: {0} ventas, {1} cobros, {2} visitas",
        ["resumenDiario.kpi.ventas"] = "VENTAS",
        ["resumenDiario.kpi.cobros"] = "COBROS",
        ["resumenDiario.kpi.pedidos"] = "PEDIDOS",
        ["resumenDiario.kpi.visitas"] = "VISITAS",

        // Cobro Vencido
        ["cobroVencido.subject"] = "Reporte de Cobros Vencidos",
        ["cobroVencido.heading"] = "Cobros vencidos (ordenados por monto)",
        ["cobroVencido.kpi.totalPendiente"] = "Total pendiente",
        ["cobroVencido.kpi.clientes"] = "Clientes",
        ["cobroVencido.kpi.masAntiguo"] = "Más antiguo",
        ["cobroVencido.kpi.montoMayor"] = "Monto mayor",
        ["cobroVencido.callout"] = "Hay {0} cobro{1} vencidos por un total de {2}.",
        ["cobroVencido.notification"] = "Tienes {0} saldos vencidos",

        // Bienvenida Cliente
        ["bienvenida.subject"] = "Nuevos Clientes Registrados",
        ["bienvenida.heading"] = "Nuevos clientes registrados",
        ["bienvenida.kpi.nuevos"] = "Nuevos clientes",
        ["bienvenida.kpi.conZona"] = "Con zona asignada",
        ["bienvenida.callout.single"] = "Se registró 1 nuevo cliente. Revisa la información y haz seguimiento.",
        ["bienvenida.callout.multi"] = "Se registraron {0} nuevos clientes. Revisa la información y haz seguimiento.",
        ["bienvenida.notification"] = "Nuevo cliente registrado",

        // Cliente Inactivo
        ["clienteInactivo.subject"] = "Reporte de Clientes Inactivos",
        ["clienteInactivo.heading"] = "Clientes sin visitar",
        ["clienteInactivo.kpi.sinVisita"] = "Sin visita",
        ["clienteInactivo.kpi.visitasAgendadas"] = "Visitas agendadas",
        ["clienteInactivo.kpi.sinVendedor"] = "Sin vendedor",
        ["clienteInactivo.callout"] = "Se agendaron {0} visitas automáticamente para clientes sin actividad reciente.",
        ["clienteInactivo.visitNote"] = "Visita agendada automáticamente — cliente sin visitar en {0}+ días",

        // Pedido Recurrente
        ["pedidoRecurrente.subject"] = "Oportunidades de Reorden Inteligente",
        ["pedidoRecurrente.heading"] = "Clientes con oportunidad de reorden (urgencia × valor)",
        ["pedidoRecurrente.kpi.oportunidades"] = "Oportunidades",
        ["pedidoRecurrente.kpi.valorEstimado"] = "Valor estimado",
        ["pedidoRecurrente.kpi.urgentes"] = "Urgentes",

        // Meta No Cumplida
        ["metaNoCumplida.subject"] = "Alerta — Metas Semanales",
        ["metaNoCumplida.heading"] = "Vendedores con alerta de meta",

        // Ruta Semanal
        ["rutaSemanal.routeName"] = "Ruta semanal — {0}",
        ["rutaSemanal.notification"] = "Se generó tu ruta para el {0} con {1} paradas.",

        // Cobro Exitoso
        ["cobroExitoso.notification.title"] = "Cobro registrado exitosamente",
        ["cobroExitoso.notification"] = "Cobro registrado: {0} — {1}",

        // Result messages (used in AutomationResult)
        ["result.sinClientesNuevos"] = "Sin clientes nuevos",
        ["result.todosClientesVisitados"] = "Todos los clientes tienen visitas recientes",
        ["result.sinCobrosNuevos"] = "Sin cobros nuevos desde la última ejecución",
        ["result.sinSaldosVencidos"] = "Sin saldos vencidos",
        ["result.sinMetasAutoRenovar"] = "Sin metas para auto-renovar",
        ["result.sinMetasConfiguradas"] = "Sin metas configuradas para el período actual",
        ["result.sinClientesRecurrentes"] = "Sin clientes con historial recurrente",
        ["result.todosClientesCicloNormal"] = "Todos los clientes están dentro de su ciclo normal de pedido",
        ["result.sinVendedoresActivos"] = "Sin vendedores activos",

        // Misc
        ["misc.sinAsignar"] = "Sin asignar",
        ["misc.sinNombre"] = "Sin nombre",

        // Table Headers
        ["table.producto"] = "Producto",
        ["table.stock"] = "Stock",
        ["table.minimo"] = "Mínimo",
        ["table.vendedor"] = "Vendedor",
        ["table.ventas"] = "Ventas",
        ["table.pedidos"] = "Pedidos",
        ["table.cliente"] = "Cliente",
        ["table.monto"] = "Monto",
        ["table.dias"] = "Días",
        ["table.zona"] = "Zona",
        ["table.telefono"] = "Teléfono",
        ["table.email"] = "Email",
        ["table.ultimaVisita"] = "Última visita",
        ["table.diasSinPedido"] = "Días s/pedido",
        ["table.ciclo"] = "Ciclo",
        ["table.valor"] = "Valor est.",
        ["table.urgencia"] = "Urgencia",
        ["table.meta"] = "Meta",
        ["table.actual"] = "Actual",
        ["table.tipo"] = "Tipo",
        ["table.cumplimiento"] = "Cumplimiento",
    };

    private static readonly Dictionary<string, string> English = new()
    {
        // Footer
        ["email.footer1"] = "This email was automatically generated by HandySuites.",
        ["email.footer2"] = "You can configure your notifications from the Automations panel.",

        // Stock Bajo
        ["stockBajo.subject"] = "Low Stock Alert",
        ["stockBajo.heading"] = "Products that need restocking",
        ["stockBajo.kpi.afectados"] = "Products affected",
        ["stockBajo.kpi.sinStock"] = "Out of stock",
        ["stockBajo.kpi.stockBajo"] = "Low stock",
        ["stockBajo.notification"] = "products with low or no stock",
        ["stockBajo.result"] = "Alert sent: {0} products with low stock",

        // Inventario Crítico
        ["inventarioCritico.subject"] = "Critical Inventory — Immediate Action",
        ["inventarioCritico.heading"] = "Products out of stock",
        ["inventarioCritico.kpi.sinStock"] = "Out of stock",
        ["inventarioCritico.kpi.afectados"] = "Products affected",
        ["inventarioCritico.callout"] = "Vendors won't be able to offer these. Restock as soon as possible.",
        ["inventarioCritico.result"] = "Alert sent: {0} products with zero inventory",

        // Resumen Diario
        ["resumenDiario.subject"] = "Daily Summary",
        ["resumenDiario.noActivity"] = "No commercial activity was recorded today. Is there anything that can be improved for tomorrow?",
        ["resumenDiario.summary"] = "{0} invoiced across {1} order{2}",
        ["resumenDiario.topVendors"] = "Top Vendors of the Day",
        ["resumenDiario.topClients"] = "Top Clients of the Day",
        ["resumenDiario.notification"] = "Your daily summary is ready. We sent it to your email.",
        ["resumenDiario.result"] = "Summary sent: {0} sales, {1} collections, {2} visits",
        ["resumenDiario.kpi.ventas"] = "SALES",
        ["resumenDiario.kpi.cobros"] = "COLLECTIONS",
        ["resumenDiario.kpi.pedidos"] = "ORDERS",
        ["resumenDiario.kpi.visitas"] = "VISITS",

        // Cobro Vencido
        ["cobroVencido.subject"] = "Overdue Payments Report",
        ["cobroVencido.heading"] = "Overdue payments (sorted by amount)",
        ["cobroVencido.kpi.totalPendiente"] = "Total pending",
        ["cobroVencido.kpi.clientes"] = "Clients",
        ["cobroVencido.kpi.masAntiguo"] = "Oldest",
        ["cobroVencido.kpi.montoMayor"] = "Largest amount",
        ["cobroVencido.callout"] = "There are {0} overdue payment{1} totaling {2}.",
        ["cobroVencido.notification"] = "You have {0} overdue balances",

        // Bienvenida Cliente
        ["bienvenida.subject"] = "New Clients Registered",
        ["bienvenida.heading"] = "New clients registered",
        ["bienvenida.kpi.nuevos"] = "New clients",
        ["bienvenida.kpi.conZona"] = "With assigned zone",
        ["bienvenida.callout.single"] = "1 new client was registered. Review the information and follow up.",
        ["bienvenida.callout.multi"] = "{0} new clients were registered. Review the information and follow up.",
        ["bienvenida.notification"] = "New client registered",

        // Cliente Inactivo
        ["clienteInactivo.subject"] = "Inactive Clients Report",
        ["clienteInactivo.heading"] = "Clients not visited",
        ["clienteInactivo.kpi.sinVisita"] = "Not visited",
        ["clienteInactivo.kpi.visitasAgendadas"] = "Visits scheduled",
        ["clienteInactivo.kpi.sinVendedor"] = "No vendor",
        ["clienteInactivo.callout"] = "{0} visits were automatically scheduled for clients without recent activity.",
        ["clienteInactivo.visitNote"] = "Automatically scheduled visit — client not visited in {0}+ days",

        // Pedido Recurrente
        ["pedidoRecurrente.subject"] = "Smart Reorder Opportunities",
        ["pedidoRecurrente.heading"] = "Clients with reorder opportunity (urgency × value)",
        ["pedidoRecurrente.kpi.oportunidades"] = "Opportunities",
        ["pedidoRecurrente.kpi.valorEstimado"] = "Estimated value",
        ["pedidoRecurrente.kpi.urgentes"] = "Urgent",

        // Meta No Cumplida
        ["metaNoCumplida.subject"] = "Alert — Weekly Goals",
        ["metaNoCumplida.heading"] = "Vendors with goal alerts",

        // Ruta Semanal
        ["rutaSemanal.routeName"] = "Weekly route — {0}",
        ["rutaSemanal.notification"] = "Your route for {0} with {1} stops has been generated.",

        // Cobro Exitoso
        ["cobroExitoso.notification.title"] = "Payment registered successfully",
        ["cobroExitoso.notification"] = "Payment registered: {0} — {1}",

        // Result messages
        ["result.sinClientesNuevos"] = "No new clients",
        ["result.todosClientesVisitados"] = "All clients have recent visits",
        ["result.sinCobrosNuevos"] = "No new payments since last execution",
        ["result.sinSaldosVencidos"] = "No overdue balances",
        ["result.sinMetasAutoRenovar"] = "No goals to auto-renew",
        ["result.sinMetasConfiguradas"] = "No goals configured for the current period",
        ["result.sinClientesRecurrentes"] = "No clients with recurring history",
        ["result.todosClientesCicloNormal"] = "All clients are within their normal order cycle",
        ["result.sinVendedoresActivos"] = "No active vendors",

        // Table Headers
        // Misc
        ["misc.sinAsignar"] = "Unassigned",
        ["misc.sinNombre"] = "No name",

        // Table Headers
        ["table.producto"] = "Product",
        ["table.stock"] = "Stock",
        ["table.minimo"] = "Minimum",
        ["table.vendedor"] = "Vendor",
        ["table.ventas"] = "Sales",
        ["table.pedidos"] = "Orders",
        ["table.cliente"] = "Client",
        ["table.monto"] = "Amount",
        ["table.dias"] = "Days",
        ["table.zona"] = "Zone",
        ["table.telefono"] = "Phone",
        ["table.email"] = "Email",
        ["table.ultimaVisita"] = "Last visit",
        ["table.diasSinPedido"] = "Days w/o order",
        ["table.ciclo"] = "Cycle",
        ["table.valor"] = "Est. value",
        ["table.urgencia"] = "Urgency",
        ["table.meta"] = "Goal",
        ["table.actual"] = "Actual",
        ["table.tipo"] = "Type",
        ["table.cumplimiento"] = "Achievement",
    };
}
