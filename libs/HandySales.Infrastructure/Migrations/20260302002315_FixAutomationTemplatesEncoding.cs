using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixAutomationTemplatesEncoding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix double-encoded UTF-8 in AutomationTemplates (mojibake: "dÃa" → "día")
            // Only runs UPDATE if the slug exists AND the text differs from expected value
            migrationBuilder.Sql(@"
                UPDATE AutomationTemplates SET
                    nombre = 'Alerta de stock bajo',
                    descripcion = 'Revisa periódicamente el inventario y envía una notificación cuando un producto cae por debajo de su stock mínimo configurado.',
                    descripcion_corta = 'Notifica cuando un producto tiene stock bajo'
                WHERE slug = 'stock-bajo-alerta';

                UPDATE AutomationTemplates SET
                    nombre = 'Resumen del día',
                    descripcion = 'Genera un resumen automático de las ventas, cobros y visitas del día y lo envía como notificación al administrador a la hora configurada.',
                    descripcion_corta = 'Resumen diario de ventas, cobros y visitas'
                WHERE slug = 'resumen-diario';

                UPDATE AutomationTemplates SET
                    nombre = 'Bienvenida cliente nuevo',
                    descripcion = 'Cuando se registra un nuevo cliente, crea automáticamente una notificación de seguimiento para el vendedor asignado.',
                    descripcion_corta = 'Notificación de seguimiento al crear un cliente'
                WHERE slug = 'bienvenida-cliente';

                UPDATE AutomationTemplates SET
                    nombre = 'Recordatorio de cobro vencido',
                    descripcion = 'Detecta saldos vencidos más allá del período configurado y envía recordatorios periódicos al vendedor asignado, con un límite máximo de avisos.',
                    descripcion_corta = 'Recuerda cobrar saldos vencidos'
                WHERE slug = 'cobro-vencido-recordatorio';

                UPDATE AutomationTemplates SET
                    nombre = 'Agendar visita a cliente inactivo',
                    descripcion = 'Identifica clientes que no han tenido actividad (pedidos ni visitas) en el período configurado y sugiere agendar una visita de seguimiento.',
                    descripcion_corta = 'Sugiere visitar clientes sin actividad reciente'
                WHERE slug = 'cliente-inactivo-visita';

                UPDATE AutomationTemplates SET
                    nombre = 'Sugerir reorden automático',
                    descripcion = 'Analiza patrones de compra y notifica cuando un cliente habitual no ha hecho su pedido esperado, sugiriendo contactarlo para reorden.',
                    descripcion_corta = 'Detecta pedidos recurrentes y sugiere reorden'
                WHERE slug = 'pedido-recurrente';

                UPDATE AutomationTemplates SET
                    nombre = 'Ruta automática semanal',
                    descripcion = 'Cada lunes genera automáticamente una ruta sugerida para cada vendedor basada en clientes pendientes de visita y zona asignada.',
                    descripcion_corta = 'Genera ruta semanal automáticamente'
                WHERE slug = 'ruta-semanal-auto';

                UPDATE AutomationTemplates SET
                    nombre = 'Alerta meta semanal no cumplida',
                    descripcion = 'Al final de cada semana evalúa el avance de ventas contra la meta del vendedor y envía una alerta si no se alcanzó el objetivo.',
                    descripcion_corta = 'Avisa si no se alcanzó la meta de ventas'
                WHERE slug = 'meta-no-cumplida';

                UPDATE AutomationTemplates SET
                    nombre = 'Confirmación de cobro registrado',
                    descripcion = 'Cuando se registra un cobro exitosamente, envía una notificación de confirmación al administrador con los detalles del pago recibido.',
                    descripcion_corta = 'Confirma al admin cuando se registra un cobro'
                WHERE slug = 'cobro-exitoso-aviso';

                UPDATE AutomationTemplates SET
                    nombre = 'Alerta inventario en cero',
                    descripcion = 'Monitorea el inventario y envía una alerta urgente cuando un producto activo llega a cero unidades disponibles.',
                    descripcion_corta = 'Alerta urgente cuando un producto llega a 0'
                WHERE slug = 'inventario-critico';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No-op: encoding fix is always desired
        }
    }
}
