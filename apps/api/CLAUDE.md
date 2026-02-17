# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HandySales ERP Backend - A .NET 8 Web API for sales routing system using Clean Architecture with Domain-Driven Design principles.

## Development Commands

```bash
# Build the solution from root directory
dotnet build src/HandySales.sln

# Run the API project
cd src/HandySales.Api
dotnet run

# Run tests
cd tests/HandySales.Tests
dotnet test

# Run with specific environment
$env:ASPNETCORE_ENVIRONMENT = "Testing"  # PowerShell
export ASPNETCORE_ENVIRONMENT=Testing     # Bash/Linux

# Entity Framework migrations (if needed)
dotnet ef migrations add <MigrationName> -p src/HandySales.Infrastructure -s src/HandySales.Api
dotnet ef database update -p src/HandySales.Infrastructure -s src/HandySales.Api
```

## Architecture

### Tech Stack
- **Framework**: .NET 8 Web API with Minimal APIs
- **Database**: MySQL with Pomelo.EntityFrameworkCore (v8.0.3)
- **Authentication**: JWT Bearer with System.IdentityModel.Tokens.Jwt
- **Validation**: FluentValidation (v11.7.0)
- **Mapping**: AutoMapper (v14.0.0)
- **Documentation**: Swagger/OpenAPI (Swashbuckle.AspNetCore)
- **Logging**: Serilog.AspNetCore with file and console sinks
- **Password Hashing**: BCrypt.Net-Next
- **CORS**: Configured for frontend integration
- **Error Handling**: Global exception middleware
- **Testing**: xUnit with FluentAssertions, Moq, and AspNetCore.Mvc.Testing

### Clean Architecture Layers

1. **HandySales.Api** - Presentation Layer
   - Minimal API endpoints organized by feature (`/Endpoints` folder)
   - Configuration extensions (`/Configuration` folder):
     - `CorsExtensions.cs` - CORS policy setup
     - `JwtExtensions.cs` - JWT authentication configuration
     - `LoggingExtensions.cs` - Serilog setup
     - `ServiceRegistrationExtensions.cs` - DI container setup
   - Custom middleware (`/Middleware` folder):
     - `GlobalExceptionMiddleware.cs` - Centralized error handling
     - `RequestLoggingMiddleware.cs` - Request/response logging
   - Entry point: `Program.cs` with middleware pipeline configuration

2. **HandySales.Application** - Business Logic Layer
   - Feature-based organization with folders for each domain area:
     - Auth, Clientes, Productos, Inventario, ListasPrecios
     - Precios, Descuentos, Promociones, Zonas
     - FamiliasProductos, CategoriasClientes, CategoriasProductos
     - UnidadesMedida, Usuarios
   - Contains DTOs, validators, and business logic services
   - References: HandySales.Domain, HandySales.Shared

3. **HandySales.Domain** - Core Domain Layer
   - Entity models in `/Entities` folder (14 main entities):
     - Core: Tenant, Usuario, Cliente, Producto
     - Pricing: ListaPrecio, PrecioPorProducto, DescuentoPorCantidad, Promocion
     - Classification: CategoriaCliente, CategoriaProducto, FamiliaProducto, UnidadMedida
     - Location/Stock: Zona, Inventario
   - Domain common patterns in `/Common` folder
   - No external dependencies (pure domain logic)

4. **HandySales.Infrastructure** - Data Access Layer
   - Entity Framework Core implementation with MySQL
   - `HandySalesDbContext` in `/Persistence` folder with all entity DbSets
   - Repository implementations in `/Repositories` folder
   - References: HandySales.Application, HandySales.Domain, HandySales.Shared

5. **HandySales.Shared** - Cross-cutting Concerns
   - Shared utilities and constants across all layers

### Key Patterns
- Clean Architecture with strict dependency inversion
- Minimal APIs organized by feature endpoints (14 endpoint files)
- JWT Bearer authentication with custom configuration
- FluentValidation for request validation
- Repository pattern for data access abstraction
- Global exception handling with structured error responses
- Structured logging with Serilog (file + console outputs)
- CORS configuration for multiple frontend ports (3000, 3001, 5173)
- Request/response logging middleware for monitoring
- Spanish language domain modeling (business requirements)
- Central package version management via Directory.Packages.props

### Database Architecture
- MySQL database with Pomelo provider
- Multi-tenant support via Tenant entity
- Domain entities organized around sales/ERP concepts:
  - Customer management (Cliente, CategoriaCliente)
  - Product catalog (Producto, CategoriaProducto, FamiliaProducto, UnidadMedida)
  - Pricing system (ListaPrecio, PrecioPorProducto, DescuentoPorCantidad, Promocion)
  - Inventory tracking (Inventario)
  - Geographic organization (Zona)
  - User management (Usuario)

## Recent Improvements

### Security & Reliability (2024)
- **Global Exception Handling**: `GlobalExceptionMiddleware` for consistent error responses across all endpoints
- **Request Logging**: `RequestLoggingMiddleware` for comprehensive request/response monitoring
- **CORS Configuration**: Support for frontend applications on development ports (3000, 3001, 5173)
- **Structured Logging**: Serilog implementation with file rotation and console output for production monitoring
- **JWT Security**: Centralized JWT configuration with proper token validation