# 🚀 HandySales CRM - Sistema de Gestión con Membresía SaaS

Sistema CRM completo con gestión de usuarios, roles, permisos y planes de suscripción para empresas de distribución y ventas.

![Next.js](https://img.shields.io/badge/Next.js-15.4-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Características Principales

### 🔐 Sistema de Autenticación y Roles
- **5 Roles definidos**: Super Admin, Admin, Supervisor, Vendedor, Viewer
- **20+ permisos granulares** para control detallado
- **Autenticación segura** con NextAuth
- **Gestión de dispositivos** y sesiones

### 💳 Planes de Suscripción
- **Trial**: 14 días gratis, 3 usuarios
- **Básico**: $499/mes, 5 usuarios
- **Profesional**: $999/mes, 20 usuarios
- **Empresarial**: $2,499/mes, usuarios ilimitados

### 📱 API para Aplicación Móvil
- Endpoints REST para React Native
- Sincronización bidireccional
- Soporte offline
- Gestión de dispositivos móviles

### 🎯 Módulos del Sistema
- **Dashboard** con métricas en tiempo real
- **Gestión de Clientes** con geolocalización
- **Catálogo de Productos** con inventario
- **Sistema de Pedidos** con estados
- **Rutas de Entrega** optimizadas
- **Calendario** de visitas y actividades
- **Constructor de Formularios** dinámicos
- **Gestión de Usuarios** con invitaciones
- **Suscripciones** y facturación

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+ 
- npm o yarn
- Git

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/handy-sales-crm.git
cd handy-sales-crm

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Credenciales de Prueba

```
Email: admin@handysales.com
Password: admin123
```

## 📁 Estructura del Proyecto

```
handy-crm/
├── src/
│   ├── app/              # Páginas y rutas (App Router)
│   │   ├── dashboard/    # Dashboard principal
│   │   ├── users/        # Gestión de usuarios
│   │   ├── subscription/ # Planes y facturación
│   │   ├── profile/      # Perfil de usuario
│   │   ├── api/          # API Routes
│   │   │   ├── mobile/   # Endpoints para app móvil
│   │   │   └── auth/     # Autenticación
│   │   └── ...
│   ├── components/       # Componentes reutilizables
│   │   ├── ui/          # Componentes base UI
│   │   ├── layout/      # Header, Sidebar, Layout
│   │   └── ...
│   ├── hooks/           # Custom React hooks
│   │   └── usePermissions.tsx  # Control de permisos
│   ├── types/           # TypeScript types
│   ├── lib/             # Utilidades y helpers
│   └── stores/          # Estado global (Zustand)
├── public/              # Archivos estáticos
└── package.json
```

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 15.4, React 19, TypeScript
- **Estilos**: Tailwind CSS, Radix UI
- **Estado**: Zustand
- **Autenticación**: NextAuth.js
- **Gráficos**: Recharts
- **Formularios**: React Hook Form + Zod
- **Iconos**: Lucide React

## 📱 API para React Native

### Autenticación Móvil

```javascript
// POST /api/mobile/auth
const response = await fetch('https://tu-dominio.com/api/mobile/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'vendedor@handysales.com',
    password: 'password123',
    deviceInfo: {
      deviceId: 'unique-device-id',
      platform: 'ios',
      model: 'iPhone 14',
    }
  })
});
```

### Sincronización de Datos

```javascript
// POST /api/mobile/sync
const sync = await fetch('https://tu-dominio.com/api/mobile/sync', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    lastSyncAt: '2025-01-14T10:00:00Z',
    data: { orders, visits, locations }
  })
});
```

## 🚀 Despliegue

### Despliegue Rápido con Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/handy-sales-crm)

### Despliegue Manual

1. **Ejecuta el script de setup**:
   ```bash
   # Windows
   deploy-setup.bat
   
   # Linux/Mac
   chmod +x deploy-setup.sh
   ./deploy-setup.sh
   ```

2. **O manualmente**:
   ```bash
   # Subir a GitHub
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tu-usuario/handy-sales-crm.git
   git push -u origin main
   
   # Desplegar con Vercel CLI
   npm i -g vercel
   vercel
   ```

### Variables de Entorno Requeridas

```env
NEXTAUTH_URL=https://tu-dominio.vercel.app
NEXTAUTH_SECRET=genera-con-openssl-rand-base64-32
NODE_ENV=production
```

Ver [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) para guía completa.

## 📊 Planes y Precios

| Característica | Trial | Básico | Profesional | Empresarial |
|---------------|-------|---------|-------------|-------------|
| Precio | Gratis | $499/mes | $999/mes | $2,499/mes |
| Duración | 14 días | Mensual | Mensual | Mensual |
| Usuarios | 3 | 5 | 20 | Ilimitados |
| Almacenamiento | 100 MB | 5 GB | 50 GB | Ilimitado |
| Soporte | Comunidad | Email | Prioritario | 24/7 Dedicado |
| API | ❌ | ❌ | ✅ | ✅ |
| Personalización | ❌ | ❌ | Básica | Completa |

## 🔒 Seguridad

- Autenticación con JWT
- Encriptación de contraseñas
- Control de acceso basado en roles (RBAC)
- Verificación de suscripción activa
- Límites según plan contratado
- Gestión de dispositivos y sesiones

## 📈 Roadmap

- [ ] Integración con pasarelas de pago (Stripe, MercadoPago)
- [ ] Notificaciones push con Firebase
- [ ] Reportes avanzados con exportación
- [ ] PWA para instalación en dispositivos
- [ ] Modo offline completo
- [ ] Multi-idioma (ES, EN, PT)
- [ ] Integración con WhatsApp Business
- [ ] Dashboard de analytics avanzado

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea tu rama de features (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 💬 Soporte

- 📧 Email: soporte@handysales.com
- 💬 Discord: [HandySales Community](https://discord.gg/handysales)
- 📖 Documentación: [docs.handysales.com](https://docs.handysales.com)

## 🙏 Agradecimientos

- [Next.js](https://nextjs.org/)
- [Vercel](https://vercel.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)

---

Desarrollado con ❤️ por el equipo de HandySales
