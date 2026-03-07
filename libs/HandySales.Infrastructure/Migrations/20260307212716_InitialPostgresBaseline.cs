using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HandySales.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgresBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AutomationTemplates",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    slug = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    descripcion_corta = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    icono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    categoria = table.Column<int>(type: "integer", nullable: false),
                    trigger_type = table.Column<int>(type: "integer", nullable: false),
                    trigger_event = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    trigger_cron = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    action_type = table.Column<int>(type: "integer", nullable: false),
                    default_params_json = table.Column<string>(type: "jsonb", nullable: true),
                    tier = table.Column<int>(type: "integer", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationTemplates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Companies",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    CompanyName = table.Column<string>(type: "text", nullable: false),
                    CompanyLogo = table.Column<string>(type: "text", nullable: true),
                    CompanyPrimaryColor = table.Column<string>(type: "text", nullable: true),
                    CompanySecondaryColor = table.Column<string>(type: "text", nullable: true),
                    CompanyDescription = table.Column<string>(type: "text", nullable: true),
                    ContactEmail = table.Column<string>(type: "text", nullable: true),
                    ContactPhone = table.Column<string>(type: "text", nullable: true),
                    Address = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    State = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: false),
                    PostalCode = table.Column<string>(type: "text", nullable: true),
                    Timezone = table.Column<string>(type: "text", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    TaxId = table.Column<string>(type: "text", nullable: true),
                    SubscriptionStatus = table.Column<int>(type: "integer", nullable: false),
                    SubscriptionPlan = table.Column<string>(type: "text", nullable: false),
                    SubscriptionExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    TrialEndsAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MaxUsers = table.Column<int>(type: "integer", nullable: true),
                    CurrentUsers = table.Column<int>(type: "integer", nullable: false),
                    MaxStorage = table.Column<long>(type: "bigint", nullable: true),
                    CurrentStorage = table.Column<long>(type: "bigint", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Companies", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GlobalSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlatformName = table.Column<string>(type: "text", nullable: false),
                    PlatformLogo = table.Column<string>(type: "text", nullable: true),
                    PlatformLogoPublicId = table.Column<string>(type: "text", nullable: true),
                    PlatformPrimaryColor = table.Column<string>(type: "text", nullable: false),
                    PlatformSecondaryColor = table.Column<string>(type: "text", nullable: false),
                    DefaultLanguage = table.Column<string>(type: "text", nullable: false),
                    DefaultTimezone = table.Column<string>(type: "text", nullable: false),
                    AllowSelfRegistration = table.Column<bool>(type: "boolean", nullable: false),
                    RequireEmailVerification = table.Column<bool>(type: "boolean", nullable: false),
                    MaxUsersPerCompany = table.Column<int>(type: "integer", nullable: true),
                    MaxStoragePerCompany = table.Column<long>(type: "bigint", nullable: true),
                    MaintenanceMode = table.Column<bool>(type: "boolean", nullable: false),
                    MaintenanceMessage = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GlobalSettings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    descripcion = table.Column<string>(type: "TEXT", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "scheduled_actions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    action_type = table.Column<string>(type: "text", nullable: false),
                    target_id = table.Column<int>(type: "integer", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancelled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    notification_sent = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: true),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_by_user_id = table.Column<int>(type: "integer", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scheduled_actions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "subscription_plans",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    codigo = table.Column<string>(type: "text", nullable: false),
                    precio_mensual = table.Column<decimal>(type: "numeric", nullable: false),
                    precio_anual = table.Column<decimal>(type: "numeric", nullable: false),
                    max_usuarios = table.Column<int>(type: "integer", nullable: false),
                    max_productos = table.Column<int>(type: "integer", nullable: false),
                    max_clientes_por_mes = table.Column<int>(type: "integer", nullable: false),
                    incluye_reportes = table.Column<bool>(type: "boolean", nullable: false),
                    incluye_soporte_prioritario = table.Column<bool>(type: "boolean", nullable: false),
                    caracteristicas = table.Column<string>(type: "jsonb", nullable: false),
                    stripe_price_id_mensual = table.Column<string>(type: "text", nullable: true),
                    stripe_price_id_anual = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subscription_plans", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre_empresa = table.Column<string>(type: "text", nullable: false),
                    cloudinary_folder = table.Column<string>(type: "text", nullable: true),
                    plan_tipo = table.Column<string>(type: "text", nullable: true),
                    max_usuarios = table.Column<int>(type: "integer", nullable: false),
                    fecha_suscripcion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_expiracion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    stripe_customer_id = table.Column<string>(type: "text", nullable: true),
                    stripe_subscription_id = table.Column<string>(type: "text", nullable: true),
                    stripe_price_id = table.Column<string>(type: "text", nullable: true),
                    subscription_status = table.Column<string>(type: "text", nullable: false),
                    grace_period_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancelled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cancellation_reason = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "CategoriasClientes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoriasClientes", x => x.id);
                    table.ForeignKey(
                        name: "FK_CategoriasClientes_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CategoriasProductos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoriasProductos", x => x.id);
                    table.ForeignKey(
                        name: "FK_CategoriasProductos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "company_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    company_id = table.Column<int>(type: "integer", nullable: true),
                    company_name = table.Column<string>(type: "text", nullable: false),
                    primary_color = table.Column<string>(type: "text", nullable: false),
                    secondary_color = table.Column<string>(type: "text", nullable: false),
                    logo_url = table.Column<string>(type: "text", nullable: true),
                    logo_public_id = table.Column<string>(type: "text", nullable: true),
                    cloudinary_folder = table.Column<string>(type: "text", nullable: true),
                    timezone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    currency = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    theme = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_company_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_company_settings_Companies_company_id",
                        column: x => x.company_id,
                        principalTable: "Companies",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_company_settings_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "datos_facturacion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RFC = table.Column<string>(type: "character varying(13)", maxLength: 13, nullable: false),
                    RazonSocial = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NombreComercial = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Calle = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NumeroExterior = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    NumeroInterior = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Colonia = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Municipio = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Estado = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CodigoPostal = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    Pais = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    RegimenFiscal = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    UsoCFDI = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    CorreoElectronico = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CertificadoCSD = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    LlaveCSD = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    PasswordCSD = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LogoFactura = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Serie = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    FolioInicial = table.Column<int>(type: "integer", nullable: false),
                    FolioActual = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    FacturacionActiva = table.Column<bool>(type: "boolean", nullable: false),
                    VersionCFDI = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LugarExpedicion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    NombrePAC = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    UsuarioPAC = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PasswordPAC = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    URLPACTimbrado = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    URLPACCancelacion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    TipoComprobantePredeterminado = table.Column<string>(type: "character varying(1)", maxLength: 1, nullable: false),
                    FormaPagoPredeterminada = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    MetodoPagoPredeterminado = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    MonedaPredeterminada = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_datos_facturacion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_datos_facturacion_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DatosEmpresa",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    razon_social = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    identificador_fiscal = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    tipo_identificador_fiscal = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    contacto = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    direccion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ciudad = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    estado = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    codigo_postal = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    sitio_web = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DatosEmpresa", x => x.id);
                    table.ForeignKey(
                        name: "FK_DatosEmpresa_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FamiliasProductos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FamiliasProductos", x => x.id);
                    table.ForeignKey(
                        name: "FK_FamiliasProductos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListasPrecios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListasPrecios", x => x.id);
                    table.ForeignKey(
                        name: "FK_ListasPrecios_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Promociones",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    descuento_porcentaje = table.Column<decimal>(type: "numeric", nullable: false),
                    fecha_inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Promociones", x => x.id);
                    table.ForeignKey(
                        name: "FK_Promociones_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UnidadesMedida",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    abreviatura = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnidadesMedida", x => x.id);
                    table.ForeignKey(
                        name: "FK_UnidadesMedida_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    email = table.Column<string>(type: "text", nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    es_admin = table.Column<bool>(type: "boolean", nullable: false),
                    es_super_admin = table.Column<bool>(type: "boolean", nullable: false),
                    rol = table.Column<string>(type: "text", nullable: true),
                    role_id = table.Column<int>(type: "integer", nullable: true),
                    avatar_url = table.Column<string>(type: "text", nullable: true),
                    CompanyId = table.Column<int>(type: "integer", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    session_version = table.Column<int>(type: "integer", nullable: false),
                    totp_secret_encrypted = table.Column<string>(type: "text", nullable: true),
                    totp_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    totp_enabled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    password_reset_token = table.Column<string>(type: "text", nullable: true),
                    password_reset_expiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    email_verificado = table.Column<bool>(type: "boolean", nullable: false),
                    codigo_verificacion = table.Column<string>(type: "text", nullable: true),
                    codigo_verificacion_expiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    supervisor_id = table.Column<int>(type: "integer", nullable: true),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.id);
                    table.ForeignKey(
                        name: "FK_Usuarios_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Usuarios_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Usuarios_Usuarios_supervisor_id",
                        column: x => x.supervisor_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Usuarios_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Zonas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    centro_latitud = table.Column<double>(type: "double precision", nullable: true),
                    centro_longitud = table.Column<double>(type: "double precision", nullable: true),
                    radio_km = table.Column<double>(type: "double precision", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Zonas", x => x.id);
                    table.ForeignKey(
                        name: "FK_Zonas_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Productos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    codigo_barra = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: false),
                    ImagenUrl = table.Column<string>(type: "text", nullable: true),
                    familia_id = table.Column<int>(type: "integer", nullable: false),
                    categoria_id = table.Column<int>(type: "integer", nullable: false),
                    unidad_medida_id = table.Column<int>(type: "integer", nullable: false),
                    precio_base = table.Column<decimal>(type: "numeric", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Productos", x => x.id);
                    table.ForeignKey(
                        name: "FK_Productos_CategoriasProductos_categoria_id",
                        column: x => x.categoria_id,
                        principalTable: "CategoriasProductos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Productos_FamiliasProductos_familia_id",
                        column: x => x.familia_id,
                        principalTable: "FamiliasProductos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Productos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Productos_UnidadesMedida_unidad_medida_id",
                        column: x => x.unidad_medida_id,
                        principalTable: "UnidadesMedida",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "activity_logs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    activity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    activity_category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    activity_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    entity_id = table.Column<int>(type: "integer", nullable: true),
                    entity_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    old_values = table.Column<string>(type: "json", nullable: true),
                    new_values = table.Column<string>(type: "json", nullable: true),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    browser = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    browser_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    operating_system = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    device_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    country_code = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: true),
                    country_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    city = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    region = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    latitude = table.Column<decimal>(type: "numeric", nullable: true),
                    longitude = table.Column<decimal>(type: "numeric", nullable: true),
                    session_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    request_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    request_method = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    request_url = table.Column<string>(type: "text", nullable: true),
                    response_status = table.Column<int>(type: "integer", nullable: true),
                    response_time_ms = table.Column<int>(type: "integer", nullable: true),
                    description = table.Column<string>(type: "text", nullable: true),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    stack_trace = table.Column<string>(type: "text", nullable: true),
                    additional_data = table.Column<string>(type: "json", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_activity_logs", x => x.id);
                    table.ForeignKey(
                        name: "FK_activity_logs_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_activity_logs_Usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Announcements",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    titulo = table.Column<string>(type: "text", nullable: false),
                    mensaje = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    prioridad = table.Column<int>(type: "integer", nullable: false),
                    target_tenant_ids = table.Column<string>(type: "text", nullable: true),
                    target_roles = table.Column<string>(type: "text", nullable: true),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    display_mode = table.Column<int>(type: "integer", nullable: false),
                    is_dismissible = table.Column<bool>(type: "boolean", nullable: false),
                    super_admin_id = table.Column<int>(type: "integer", nullable: false),
                    data_json = table.Column<string>(type: "text", nullable: true),
                    sent_count = table.Column<int>(type: "integer", nullable: false),
                    read_count = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Announcements", x => x.id);
                    table.ForeignKey(
                        name: "FK_Announcements_Usuarios_super_admin_id",
                        column: x => x.super_admin_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Clientes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    rfc = table.Column<string>(type: "text", nullable: false),
                    correo = table.Column<string>(type: "text", nullable: false),
                    telefono = table.Column<string>(type: "text", nullable: false),
                    direccion = table.Column<string>(type: "text", nullable: false),
                    numero_exterior = table.Column<string>(type: "text", nullable: true),
                    id_zona = table.Column<int>(type: "integer", nullable: false),
                    categoria_cliente_id = table.Column<int>(type: "integer", nullable: false),
                    vendedor_id = table.Column<int>(type: "integer", nullable: true),
                    latitud = table.Column<double>(type: "double precision", nullable: true),
                    longitud = table.Column<double>(type: "double precision", nullable: true),
                    es_prospecto = table.Column<bool>(type: "boolean", nullable: false),
                    comentarios = table.Column<string>(type: "text", nullable: true),
                    lista_precios_id = table.Column<int>(type: "integer", nullable: true),
                    descuento = table.Column<decimal>(type: "numeric", nullable: false),
                    saldo = table.Column<decimal>(type: "numeric", nullable: false),
                    limite_credito = table.Column<decimal>(type: "numeric", nullable: false),
                    venta_minima_efectiva = table.Column<decimal>(type: "numeric", nullable: false),
                    tipos_pago_permitidos = table.Column<string>(type: "text", nullable: false),
                    tipo_pago_predeterminado = table.Column<string>(type: "text", nullable: false),
                    dias_credito = table.Column<int>(type: "integer", nullable: false),
                    ciudad = table.Column<string>(type: "text", nullable: true),
                    colonia = table.Column<string>(type: "text", nullable: true),
                    codigo_postal = table.Column<string>(type: "text", nullable: true),
                    encargado = table.Column<string>(type: "text", nullable: true),
                    razon_social = table.Column<string>(type: "text", nullable: true),
                    codigo_postal_fiscal = table.Column<string>(type: "text", nullable: true),
                    regimen_fiscal = table.Column<string>(type: "text", nullable: true),
                    uso_cfdi_predeterminado = table.Column<string>(type: "text", nullable: true),
                    facturable = table.Column<bool>(type: "boolean", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clientes", x => x.id);
                    table.ForeignKey(
                        name: "FK_Clientes_CategoriasClientes_categoria_cliente_id",
                        column: x => x.categoria_cliente_id,
                        principalTable: "CategoriasClientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Clientes_ListasPrecios_lista_precios_id",
                        column: x => x.lista_precios_id,
                        principalTable: "ListasPrecios",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_Clientes_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Clientes_Usuarios_vendedor_id",
                        column: x => x.vendedor_id,
                        principalTable: "Usuarios",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "CrashReports",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: true),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    device_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    device_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    app_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    os_version = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    error_message = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    stack_trace = table.Column<string>(type: "text", nullable: true),
                    component_name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    severity = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    resuelto = table.Column<bool>(type: "boolean", nullable: false),
                    nota_resolucion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    resuelto_por = table.Column<int>(type: "integer", nullable: true),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ResueltoByUsuarioId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CrashReports", x => x.id);
                    table.ForeignKey(
                        name: "FK_CrashReports_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_CrashReports_Usuarios_ResueltoByUsuarioId",
                        column: x => x.ResueltoByUsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_CrashReports_Usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "Usuarios",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "ImpersonationSessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    super_admin_id = table.Column<int>(type: "integer", nullable: false),
                    super_admin_email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    super_admin_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    target_tenant_id = table.Column<int>(type: "integer", nullable: false),
                    target_tenant_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ticket_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    access_level = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ended_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    expires_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ip_address = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: false),
                    user_agent = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    actions_performed = table.Column<string>(type: "jsonb", nullable: false),
                    pages_visited = table.Column<string>(type: "jsonb", nullable: false),
                    notification_sent = table.Column<bool>(type: "boolean", nullable: false),
                    notification_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImpersonationSessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_ImpersonationSessions_Tenants_target_tenant_id",
                        column: x => x.target_tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ImpersonationSessions_Usuarios_super_admin_id",
                        column: x => x.super_admin_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MetasVendedor",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    tipo = table.Column<string>(type: "text", nullable: false),
                    periodo = table.Column<string>(type: "text", nullable: false),
                    monto = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    fecha_inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    auto_renovar = table.Column<bool>(type: "boolean", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MetasVendedor", x => x.id);
                    table.ForeignKey(
                        name: "FK_MetasVendedor_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MetasVendedor_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "notification_preferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    EmailNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    PushNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    SmsNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    DesktopNotifications = table.Column<bool>(type: "boolean", nullable: false),
                    EmailOrderUpdates = table.Column<bool>(type: "boolean", nullable: false),
                    EmailInventoryAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    EmailWeeklyReports = table.Column<bool>(type: "boolean", nullable: false),
                    PushOrderUpdates = table.Column<bool>(type: "boolean", nullable: false),
                    PushInventoryAlerts = table.Column<bool>(type: "boolean", nullable: false),
                    PushRouteReminders = table.Column<bool>(type: "boolean", nullable: false),
                    QuietHoursStart = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    QuietHoursEnd = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notification_preferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_notification_preferences_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_notification_preferences_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Token = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsRevoked = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByToken = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Usuarios_UserId",
                        column: x => x.UserId,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TenantAutomations",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    template_id = table.Column<int>(type: "integer", nullable: false),
                    params_json = table.Column<string>(type: "jsonb", nullable: true),
                    activated_by = table.Column<int>(type: "integer", nullable: false),
                    last_executed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    execution_count = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TenantAutomations", x => x.id);
                    table.ForeignKey(
                        name: "FK_TenantAutomations_AutomationTemplates_template_id",
                        column: x => x.template_id,
                        principalTable: "AutomationTemplates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TenantAutomations_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TenantAutomations_Usuarios_activated_by",
                        column: x => x.activated_by,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "TwoFactorRecoveryCodes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    code_hash = table.Column<string>(type: "text", nullable: false),
                    used_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TwoFactorRecoveryCodes", x => x.id);
                    table.ForeignKey(
                        name: "FK_TwoFactorRecoveryCodes_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RutasVendedor",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    zona_id = table.Column<int>(type: "integer", nullable: true),
                    nombre = table.Column<string>(type: "text", nullable: false),
                    descripcion = table.Column<string>(type: "text", nullable: true),
                    fecha = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    hora_inicio_estimada = table.Column<TimeSpan>(type: "interval", nullable: true),
                    hora_fin_estimada = table.Column<TimeSpan>(type: "interval", nullable: true),
                    hora_inicio_real = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    hora_fin_real = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    kilometros_estimados = table.Column<double>(type: "double precision", nullable: true),
                    kilometros_reales = table.Column<double>(type: "double precision", nullable: true),
                    notas = table.Column<string>(type: "text", nullable: true),
                    efectivo_inicial = table.Column<double>(type: "double precision", nullable: true),
                    comentarios_carga = table.Column<string>(type: "text", nullable: true),
                    monto_recibido = table.Column<double>(type: "double precision", nullable: true),
                    cerrado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    cerrado_por = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutasVendedor", x => x.id);
                    table.ForeignKey(
                        name: "FK_RutasVendedor_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutasVendedor_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RutasVendedor_Zonas_zona_id",
                        column: x => x.zona_id,
                        principalTable: "Zonas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "DescuentosPorCantidad",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: true),
                    cantidad_minima = table.Column<decimal>(type: "numeric", nullable: false),
                    descuento_porcentaje = table.Column<decimal>(type: "numeric", nullable: false),
                    tipo_aplicacion = table.Column<string>(type: "text", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DescuentosPorCantidad", x => x.id);
                    table.ForeignKey(
                        name: "FK_DescuentosPorCantidad_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_DescuentosPorCantidad_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Inventario",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    cantidad_actual = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_minimo = table.Column<decimal>(type: "numeric", nullable: false),
                    stock_maximo = table.Column<decimal>(type: "numeric", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Inventario", x => x.id);
                    table.ForeignKey(
                        name: "FK_Inventario_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Inventario_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MovimientosInventario",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    tipo_movimiento = table.Column<string>(type: "text", nullable: false),
                    cantidad = table.Column<decimal>(type: "numeric", nullable: false),
                    cantidad_anterior = table.Column<decimal>(type: "numeric", nullable: false),
                    cantidad_nueva = table.Column<decimal>(type: "numeric", nullable: false),
                    motivo = table.Column<string>(type: "text", nullable: true),
                    comentario = table.Column<string>(type: "text", nullable: true),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    referencia_id = table.Column<int>(type: "integer", nullable: true),
                    referencia_tipo = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MovimientosInventario", x => x.id);
                    table.ForeignKey(
                        name: "FK_MovimientosInventario_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovimientosInventario_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MovimientosInventario_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PreciosPorProducto",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    lista_precio_id = table.Column<int>(type: "integer", nullable: false),
                    precio = table.Column<decimal>(type: "numeric", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreciosPorProducto", x => x.id);
                    table.ForeignKey(
                        name: "FK_PreciosPorProducto_ListasPrecios_lista_precio_id",
                        column: x => x.lista_precio_id,
                        principalTable: "ListasPrecios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreciosPorProducto_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PreciosPorProducto_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PromocionProductos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    promocion_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PromocionProductos", x => x.id);
                    table.ForeignKey(
                        name: "FK_PromocionProductos_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PromocionProductos_Promociones_promocion_id",
                        column: x => x.promocion_id,
                        principalTable: "Promociones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AnnouncementDismissals",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    announcement_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    dismissed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnouncementDismissals", x => x.id);
                    table.ForeignKey(
                        name: "FK_AnnouncementDismissals_Announcements_announcement_id",
                        column: x => x.announcement_id,
                        principalTable: "Announcements",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AnnouncementDismissals_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Pedidos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    numero_pedido = table.Column<string>(type: "text", nullable: false),
                    fecha_pedido = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    fecha_entrega_estimada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_entrega_real = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    tipo_venta = table.Column<int>(type: "integer", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric", nullable: false),
                    descuento = table.Column<decimal>(type: "numeric", nullable: false),
                    impuestos = table.Column<decimal>(type: "numeric", nullable: false),
                    total = table.Column<decimal>(type: "numeric", nullable: false),
                    notas = table.Column<string>(type: "text", nullable: true),
                    direccion_entrega = table.Column<string>(type: "text", nullable: true),
                    latitud = table.Column<double>(type: "double precision", nullable: true),
                    longitud = table.Column<double>(type: "double precision", nullable: true),
                    lista_precio_id = table.Column<int>(type: "integer", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Pedidos", x => x.id);
                    table.ForeignKey(
                        name: "FK_Pedidos_Clientes_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "Clientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Pedidos_ListasPrecios_lista_precio_id",
                        column: x => x.lista_precio_id,
                        principalTable: "ListasPrecios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Pedidos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Pedidos_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DeviceSessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    device_id = table.Column<string>(type: "text", nullable: false),
                    device_name = table.Column<string>(type: "text", nullable: true),
                    device_type = table.Column<int>(type: "integer", nullable: false),
                    device_model = table.Column<string>(type: "text", nullable: true),
                    os_version = table.Column<string>(type: "text", nullable: true),
                    app_version = table.Column<string>(type: "text", nullable: true),
                    device_fingerprint = table.Column<string>(type: "text", nullable: true),
                    push_token = table.Column<string>(type: "text", nullable: true),
                    refresh_token_id = table.Column<int>(type: "integer", nullable: true),
                    ip_address = table.Column<string>(type: "text", nullable: true),
                    user_agent = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    last_activity = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    logged_in_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    logged_out_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    logout_reason = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeviceSessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_DeviceSessions_RefreshTokens_refresh_token_id",
                        column: x => x.refresh_token_id,
                        principalTable: "RefreshTokens",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DeviceSessions_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DeviceSessions_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AutomationExecutions",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    automation_id = table.Column<int>(type: "integer", nullable: false),
                    template_slug = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    trigger_entity = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    trigger_entity_id = table.Column<int>(type: "integer", nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    action_taken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    resultado_json = table.Column<string>(type: "text", nullable: true),
                    error_message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    ejecutado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AutomationExecutions", x => x.id);
                    table.ForeignKey(
                        name: "FK_AutomationExecutions_TenantAutomations_automation_id",
                        column: x => x.automation_id,
                        principalTable: "TenantAutomations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RutasCarga",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ruta_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    cantidad_entrega = table.Column<int>(type: "integer", nullable: false),
                    cantidad_venta = table.Column<int>(type: "integer", nullable: false),
                    cantidad_total = table.Column<int>(type: "integer", nullable: false),
                    precio_unitario = table.Column<double>(type: "double precision", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutasCarga", x => x.id);
                    table.ForeignKey(
                        name: "FK_RutasCarga_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RutasCarga_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutasCarga_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RutasRetornoInventario",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ruta_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    cantidad_inicial = table.Column<int>(type: "integer", nullable: false),
                    vendidos = table.Column<int>(type: "integer", nullable: false),
                    entregados = table.Column<int>(type: "integer", nullable: false),
                    devueltos = table.Column<int>(type: "integer", nullable: false),
                    mermas = table.Column<int>(type: "integer", nullable: false),
                    rec_almacen = table.Column<int>(type: "integer", nullable: false),
                    carga_vehiculo = table.Column<int>(type: "integer", nullable: false),
                    diferencia = table.Column<int>(type: "integer", nullable: false),
                    ventas_monto = table.Column<double>(type: "double precision", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutasRetornoInventario", x => x.id);
                    table.ForeignKey(
                        name: "FK_RutasRetornoInventario_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RutasRetornoInventario_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutasRetornoInventario_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ClienteVisitas",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    pedido_id = table.Column<int>(type: "integer", nullable: true),
                    fecha_programada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_hora_inicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    fecha_hora_fin = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    tipo_visita = table.Column<int>(type: "integer", nullable: false),
                    resultado = table.Column<int>(type: "integer", nullable: false),
                    latitud_inicio = table.Column<double>(type: "double precision", nullable: true),
                    longitud_inicio = table.Column<double>(type: "double precision", nullable: true),
                    latitud_fin = table.Column<double>(type: "double precision", nullable: true),
                    longitud_fin = table.Column<double>(type: "double precision", nullable: true),
                    distancia_cliente = table.Column<double>(type: "double precision", nullable: true),
                    notas = table.Column<string>(type: "text", nullable: true),
                    notas_privadas = table.Column<string>(type: "text", nullable: true),
                    fotos = table.Column<string>(type: "text", nullable: true),
                    duracion_minutos = table.Column<int>(type: "integer", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClienteVisitas", x => x.id);
                    table.ForeignKey(
                        name: "FK_ClienteVisitas_Clientes_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "Clientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClienteVisitas_Pedidos_pedido_id",
                        column: x => x.pedido_id,
                        principalTable: "Pedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClienteVisitas_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClienteVisitas_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Cobros",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    pedido_id = table.Column<int>(type: "integer", nullable: true),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: false),
                    monto = table.Column<decimal>(type: "numeric", nullable: false),
                    metodo_pago = table.Column<int>(type: "integer", nullable: false),
                    fecha_cobro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    referencia = table.Column<string>(type: "text", nullable: true),
                    notas = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cobros", x => x.id);
                    table.ForeignKey(
                        name: "FK_Cobros_Clientes_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "Clientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Cobros_Pedidos_pedido_id",
                        column: x => x.pedido_id,
                        principalTable: "Pedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Cobros_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Cobros_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DetallePedidos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    pedido_id = table.Column<int>(type: "integer", nullable: false),
                    producto_id = table.Column<int>(type: "integer", nullable: false),
                    cantidad = table.Column<decimal>(type: "numeric", nullable: false),
                    precio_unitario = table.Column<decimal>(type: "numeric", nullable: false),
                    descuento = table.Column<decimal>(type: "numeric", nullable: false),
                    porcentaje_descuento = table.Column<decimal>(type: "numeric", nullable: false),
                    subtotal = table.Column<decimal>(type: "numeric", nullable: false),
                    impuesto = table.Column<decimal>(type: "numeric", nullable: false),
                    total = table.Column<decimal>(type: "numeric", nullable: false),
                    notas = table.Column<string>(type: "text", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DetallePedidos", x => x.id);
                    table.ForeignKey(
                        name: "FK_DetallePedidos_Pedidos_pedido_id",
                        column: x => x.pedido_id,
                        principalTable: "Pedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DetallePedidos_Productos_producto_id",
                        column: x => x.producto_id,
                        principalTable: "Productos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RutasPedidos",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ruta_id = table.Column<int>(type: "integer", nullable: false),
                    pedido_id = table.Column<int>(type: "integer", nullable: false),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutasPedidos", x => x.id);
                    table.ForeignKey(
                        name: "FK_RutasPedidos_Pedidos_pedido_id",
                        column: x => x.pedido_id,
                        principalTable: "Pedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RutasPedidos_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RutasPedidos_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NotificationHistory",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_id = table.Column<int>(type: "integer", nullable: false),
                    usuario_id = table.Column<int>(type: "integer", nullable: true),
                    device_session_id = table.Column<int>(type: "integer", nullable: true),
                    titulo = table.Column<string>(type: "text", nullable: false),
                    mensaje = table.Column<string>(type: "text", nullable: false),
                    tipo = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    data_json = table.Column<string>(type: "text", nullable: true),
                    fcm_message_id = table.Column<string>(type: "text", nullable: true),
                    error_message = table.Column<string>(type: "text", nullable: true),
                    enviado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    leido_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationHistory", x => x.id);
                    table.ForeignKey(
                        name: "FK_NotificationHistory_DeviceSessions_device_session_id",
                        column: x => x.device_session_id,
                        principalTable: "DeviceSessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_NotificationHistory_Tenants_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "Tenants",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NotificationHistory_Usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "Usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RutasDetalle",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ruta_id = table.Column<int>(type: "integer", nullable: false),
                    cliente_id = table.Column<int>(type: "integer", nullable: false),
                    orden_visita = table.Column<int>(type: "integer", nullable: false),
                    hora_estimada_llegada = table.Column<TimeSpan>(type: "interval", nullable: true),
                    duracion_estimada_minutos = table.Column<int>(type: "integer", nullable: true),
                    hora_llegada_real = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    hora_salida_real = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    estado = table.Column<int>(type: "integer", nullable: false),
                    visita_id = table.Column<int>(type: "integer", nullable: true),
                    pedido_id = table.Column<int>(type: "integer", nullable: true),
                    notas = table.Column<string>(type: "text", nullable: true),
                    razon_omision = table.Column<string>(type: "text", nullable: true),
                    latitud = table.Column<double>(type: "double precision", nullable: true),
                    longitud = table.Column<double>(type: "double precision", nullable: true),
                    distancia_desde_anterior = table.Column<double>(type: "double precision", nullable: true),
                    activo = table.Column<bool>(type: "boolean", nullable: false),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    actualizado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_por = table.Column<string>(type: "text", nullable: true),
                    actualizado_por = table.Column<string>(type: "text", nullable: true),
                    eliminado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    eliminado_por = table.Column<string>(type: "text", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RutasDetalle", x => x.id);
                    table.ForeignKey(
                        name: "FK_RutasDetalle_ClienteVisitas_visita_id",
                        column: x => x.visita_id,
                        principalTable: "ClienteVisitas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RutasDetalle_Clientes_cliente_id",
                        column: x => x.cliente_id,
                        principalTable: "Clientes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RutasDetalle_Pedidos_pedido_id",
                        column: x => x.pedido_id,
                        principalTable: "Pedidos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RutasDetalle_RutasVendedor_ruta_id",
                        column: x => x.ruta_id,
                        principalTable: "RutasVendedor",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_activity_logs_tenant_id",
                table: "activity_logs",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_activity_logs_user_id",
                table: "activity_logs",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementDismissals_announcement_id_usuario_id",
                table: "AnnouncementDismissals",
                columns: new[] { "announcement_id", "usuario_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AnnouncementDismissals_usuario_id",
                table: "AnnouncementDismissals",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_activo",
                table: "Announcements",
                column: "activo");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_expires_at",
                table: "Announcements",
                column: "expires_at");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_super_admin_id",
                table: "Announcements",
                column: "super_admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_Announcements_tipo",
                table: "Announcements",
                column: "tipo");

            migrationBuilder.CreateIndex(
                name: "IX_AutomationExecutions_automation_id",
                table: "AutomationExecutions",
                column: "automation_id");

            migrationBuilder.CreateIndex(
                name: "IX_AutomationExecutions_tenant_id_ejecutado_en",
                table: "AutomationExecutions",
                columns: new[] { "tenant_id", "ejecutado_en" });

            migrationBuilder.CreateIndex(
                name: "IX_AutomationExecutions_tenant_id_template_slug",
                table: "AutomationExecutions",
                columns: new[] { "tenant_id", "template_slug" });

            migrationBuilder.CreateIndex(
                name: "IX_AutomationTemplates_slug",
                table: "AutomationTemplates",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CategoriasClientes_tenant_id",
                table: "CategoriasClientes",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_CategoriasProductos_tenant_id",
                table: "CategoriasProductos",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_categoria_cliente_id",
                table: "Clientes",
                column: "categoria_cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_lista_precios_id",
                table: "Clientes",
                column: "lista_precios_id");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_tenant_id",
                table: "Clientes",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_vendedor_id",
                table: "Clientes",
                column: "vendedor_id");

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_cliente_id",
                table: "ClienteVisitas",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_pedido_id",
                table: "ClienteVisitas",
                column: "pedido_id");

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_tenant_id_cliente_id",
                table: "ClienteVisitas",
                columns: new[] { "tenant_id", "cliente_id" });

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_tenant_id_fecha_hora_inicio",
                table: "ClienteVisitas",
                columns: new[] { "tenant_id", "fecha_hora_inicio" });

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_tenant_id_fecha_programada",
                table: "ClienteVisitas",
                columns: new[] { "tenant_id", "fecha_programada" });

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_tenant_id_usuario_id",
                table: "ClienteVisitas",
                columns: new[] { "tenant_id", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_ClienteVisitas_usuario_id",
                table: "ClienteVisitas",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_cliente_id",
                table: "Cobros",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_pedido_id",
                table: "Cobros",
                column: "pedido_id");

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_cliente_id",
                table: "Cobros",
                columns: new[] { "tenant_id", "cliente_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_fecha_cobro",
                table: "Cobros",
                columns: new[] { "tenant_id", "fecha_cobro" });

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_pedido_id",
                table: "Cobros",
                columns: new[] { "tenant_id", "pedido_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_tenant_id_usuario_id",
                table: "Cobros",
                columns: new[] { "tenant_id", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Cobros_usuario_id",
                table: "Cobros",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_company_settings_company_id",
                table: "company_settings",
                column: "company_id");

            migrationBuilder.CreateIndex(
                name: "IX_company_settings_tenant_id",
                table: "company_settings",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_CrashReports_ResueltoByUsuarioId",
                table: "CrashReports",
                column: "ResueltoByUsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_CrashReports_tenant_id",
                table: "CrashReports",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_CrashReports_user_id",
                table: "CrashReports",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_datos_facturacion_TenantId_RFC",
                table: "datos_facturacion",
                columns: new[] { "TenantId", "RFC" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DatosEmpresa_identificador_fiscal",
                table: "DatosEmpresa",
                column: "identificador_fiscal",
                unique: true,
                filter: "\"identificador_fiscal\" IS NOT NULL AND \"eliminado_en\" IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DatosEmpresa_tenant_id",
                table: "DatosEmpresa",
                column: "tenant_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DescuentosPorCantidad_producto_id",
                table: "DescuentosPorCantidad",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_DescuentosPorCantidad_tenant_id",
                table: "DescuentosPorCantidad",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_DetallePedidos_pedido_id_producto_id",
                table: "DetallePedidos",
                columns: new[] { "pedido_id", "producto_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DetallePedidos_producto_id",
                table: "DetallePedidos",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSessions_last_activity",
                table: "DeviceSessions",
                column: "last_activity");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSessions_refresh_token_id",
                table: "DeviceSessions",
                column: "refresh_token_id");

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSessions_tenant_id_device_id",
                table: "DeviceSessions",
                columns: new[] { "tenant_id", "device_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSessions_tenant_id_status",
                table: "DeviceSessions",
                columns: new[] { "tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSessions_tenant_id_usuario_id",
                table: "DeviceSessions",
                columns: new[] { "tenant_id", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_DeviceSessions_usuario_id",
                table: "DeviceSessions",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_FamiliasProductos_tenant_id",
                table: "FamiliasProductos",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_started_at",
                table: "ImpersonationSessions",
                column: "started_at");

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_status",
                table: "ImpersonationSessions",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_super_admin_id",
                table: "ImpersonationSessions",
                column: "super_admin_id");

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_super_admin_id_status",
                table: "ImpersonationSessions",
                columns: new[] { "super_admin_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_target_tenant_id",
                table: "ImpersonationSessions",
                column: "target_tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ImpersonationSessions_target_tenant_id_status",
                table: "ImpersonationSessions",
                columns: new[] { "target_tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_Inventario_producto_id",
                table: "Inventario",
                column: "producto_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Inventario_tenant_id",
                table: "Inventario",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_ListasPrecios_tenant_id",
                table: "ListasPrecios",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_MetasVendedor_tenant_id",
                table: "MetasVendedor",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_MetasVendedor_usuario_id",
                table: "MetasVendedor",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosInventario_producto_id",
                table: "MovimientosInventario",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosInventario_tenant_id",
                table: "MovimientosInventario",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_MovimientosInventario_usuario_id",
                table: "MovimientosInventario",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_notification_preferences_TenantId_UserId",
                table: "notification_preferences",
                columns: new[] { "TenantId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_notification_preferences_UserId",
                table: "notification_preferences",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_creado_en",
                table: "NotificationHistory",
                column: "creado_en");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_device_session_id",
                table: "NotificationHistory",
                column: "device_session_id");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_tenant_id_status",
                table: "NotificationHistory",
                columns: new[] { "tenant_id", "status" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_tenant_id_tipo",
                table: "NotificationHistory",
                columns: new[] { "tenant_id", "tipo" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_tenant_id_usuario_id",
                table: "NotificationHistory",
                columns: new[] { "tenant_id", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationHistory_usuario_id",
                table: "NotificationHistory",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_cliente_id",
                table: "Pedidos",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_lista_precio_id",
                table: "Pedidos",
                column: "lista_precio_id");

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_cliente_id",
                table: "Pedidos",
                columns: new[] { "tenant_id", "cliente_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_estado",
                table: "Pedidos",
                columns: new[] { "tenant_id", "estado" });

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_fecha_pedido",
                table: "Pedidos",
                columns: new[] { "tenant_id", "fecha_pedido" });

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_numero_pedido",
                table: "Pedidos",
                columns: new[] { "tenant_id", "numero_pedido" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_tenant_id_usuario_id",
                table: "Pedidos",
                columns: new[] { "tenant_id", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_Pedidos_usuario_id",
                table: "Pedidos",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_PreciosPorProducto_lista_precio_id",
                table: "PreciosPorProducto",
                column: "lista_precio_id");

            migrationBuilder.CreateIndex(
                name: "IX_PreciosPorProducto_producto_id",
                table: "PreciosPorProducto",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_PreciosPorProducto_tenant_id",
                table: "PreciosPorProducto",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Productos_categoria_id",
                table: "Productos",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "IX_Productos_familia_id",
                table: "Productos",
                column: "familia_id");

            migrationBuilder.CreateIndex(
                name: "IX_Productos_tenant_id",
                table: "Productos",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Productos_unidad_medida_id",
                table: "Productos",
                column: "unidad_medida_id");

            migrationBuilder.CreateIndex(
                name: "IX_Promociones_tenant_id",
                table: "Promociones",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_PromocionProductos_producto_id",
                table: "PromocionProductos",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_PromocionProductos_promocion_id",
                table: "PromocionProductos",
                column: "promocion_id");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_roles_nombre",
                table: "roles",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RutasCarga_producto_id",
                table: "RutasCarga",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasCarga_ruta_id",
                table: "RutasCarga",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasCarga_ruta_id_producto_id",
                table: "RutasCarga",
                columns: new[] { "ruta_id", "producto_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RutasCarga_tenant_id_ruta_id",
                table: "RutasCarga",
                columns: new[] { "tenant_id", "ruta_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasDetalle_cliente_id",
                table: "RutasDetalle",
                column: "cliente_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasDetalle_estado",
                table: "RutasDetalle",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_RutasDetalle_pedido_id",
                table: "RutasDetalle",
                column: "pedido_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasDetalle_ruta_id_cliente_id",
                table: "RutasDetalle",
                columns: new[] { "ruta_id", "cliente_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasDetalle_ruta_id_orden_visita",
                table: "RutasDetalle",
                columns: new[] { "ruta_id", "orden_visita" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasDetalle_visita_id",
                table: "RutasDetalle",
                column: "visita_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasPedidos_pedido_id",
                table: "RutasPedidos",
                column: "pedido_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasPedidos_ruta_id",
                table: "RutasPedidos",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasPedidos_ruta_id_pedido_id",
                table: "RutasPedidos",
                columns: new[] { "ruta_id", "pedido_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RutasPedidos_tenant_id_ruta_id",
                table: "RutasPedidos",
                columns: new[] { "tenant_id", "ruta_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasRetornoInventario_producto_id",
                table: "RutasRetornoInventario",
                column: "producto_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasRetornoInventario_ruta_id",
                table: "RutasRetornoInventario",
                column: "ruta_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasRetornoInventario_ruta_id_producto_id",
                table: "RutasRetornoInventario",
                columns: new[] { "ruta_id", "producto_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RutasRetornoInventario_tenant_id_ruta_id",
                table: "RutasRetornoInventario",
                columns: new[] { "tenant_id", "ruta_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_tenant_id_estado",
                table: "RutasVendedor",
                columns: new[] { "tenant_id", "estado" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_tenant_id_fecha",
                table: "RutasVendedor",
                columns: new[] { "tenant_id", "fecha" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_tenant_id_usuario_id",
                table: "RutasVendedor",
                columns: new[] { "tenant_id", "usuario_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_tenant_id_zona_id",
                table: "RutasVendedor",
                columns: new[] { "tenant_id", "zona_id" });

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_usuario_id",
                table: "RutasVendedor",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_RutasVendedor_zona_id",
                table: "RutasVendedor",
                column: "zona_id");

            migrationBuilder.CreateIndex(
                name: "IX_TenantAutomations_activated_by",
                table: "TenantAutomations",
                column: "activated_by");

            migrationBuilder.CreateIndex(
                name: "IX_TenantAutomations_template_id",
                table: "TenantAutomations",
                column: "template_id");

            migrationBuilder.CreateIndex(
                name: "IX_TenantAutomations_tenant_id_template_id",
                table: "TenantAutomations",
                columns: new[] { "tenant_id", "template_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TwoFactorRecoveryCodes_usuario_id",
                table: "TwoFactorRecoveryCodes",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_UnidadesMedida_tenant_id",
                table: "UnidadesMedida",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_CompanyId",
                table: "Usuarios",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_role_id",
                table: "Usuarios",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_supervisor_id",
                table: "Usuarios",
                column: "supervisor_id");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_tenant_id",
                table: "Usuarios",
                column: "tenant_id");

            migrationBuilder.CreateIndex(
                name: "IX_Zonas_tenant_id",
                table: "Zonas",
                column: "tenant_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "activity_logs");

            migrationBuilder.DropTable(
                name: "AnnouncementDismissals");

            migrationBuilder.DropTable(
                name: "AutomationExecutions");

            migrationBuilder.DropTable(
                name: "Cobros");

            migrationBuilder.DropTable(
                name: "company_settings");

            migrationBuilder.DropTable(
                name: "CrashReports");

            migrationBuilder.DropTable(
                name: "datos_facturacion");

            migrationBuilder.DropTable(
                name: "DatosEmpresa");

            migrationBuilder.DropTable(
                name: "DescuentosPorCantidad");

            migrationBuilder.DropTable(
                name: "DetallePedidos");

            migrationBuilder.DropTable(
                name: "GlobalSettings");

            migrationBuilder.DropTable(
                name: "ImpersonationSessions");

            migrationBuilder.DropTable(
                name: "Inventario");

            migrationBuilder.DropTable(
                name: "MetasVendedor");

            migrationBuilder.DropTable(
                name: "MovimientosInventario");

            migrationBuilder.DropTable(
                name: "notification_preferences");

            migrationBuilder.DropTable(
                name: "NotificationHistory");

            migrationBuilder.DropTable(
                name: "PreciosPorProducto");

            migrationBuilder.DropTable(
                name: "PromocionProductos");

            migrationBuilder.DropTable(
                name: "RutasCarga");

            migrationBuilder.DropTable(
                name: "RutasDetalle");

            migrationBuilder.DropTable(
                name: "RutasPedidos");

            migrationBuilder.DropTable(
                name: "RutasRetornoInventario");

            migrationBuilder.DropTable(
                name: "scheduled_actions");

            migrationBuilder.DropTable(
                name: "subscription_plans");

            migrationBuilder.DropTable(
                name: "TwoFactorRecoveryCodes");

            migrationBuilder.DropTable(
                name: "Announcements");

            migrationBuilder.DropTable(
                name: "TenantAutomations");

            migrationBuilder.DropTable(
                name: "DeviceSessions");

            migrationBuilder.DropTable(
                name: "Promociones");

            migrationBuilder.DropTable(
                name: "ClienteVisitas");

            migrationBuilder.DropTable(
                name: "Productos");

            migrationBuilder.DropTable(
                name: "RutasVendedor");

            migrationBuilder.DropTable(
                name: "AutomationTemplates");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "Pedidos");

            migrationBuilder.DropTable(
                name: "CategoriasProductos");

            migrationBuilder.DropTable(
                name: "FamiliasProductos");

            migrationBuilder.DropTable(
                name: "UnidadesMedida");

            migrationBuilder.DropTable(
                name: "Zonas");

            migrationBuilder.DropTable(
                name: "Clientes");

            migrationBuilder.DropTable(
                name: "CategoriasClientes");

            migrationBuilder.DropTable(
                name: "ListasPrecios");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Companies");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropTable(
                name: "roles");
        }
    }
}
