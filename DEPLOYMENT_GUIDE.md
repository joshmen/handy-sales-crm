# 🚀 Guía de Deployment para HandySales CRM

## 📋 Resumen de Cambios Realizados

### Archivos Modificados:
1. **next.config.js** - Configuración temporal para ignorar errores de build
2. **vercel.json** - Configuración optimizada para deployment
3. **src/app/calendar/page.tsx** - Arreglados imports de componentes UI
4. **src/components/ui/index.ts** - Creado archivo de barrel exports
5. **Scripts de utilidad** - Para verificar y arreglar problemas de Git

## 🐛 Problemas Encontrados y Soluciones

### 1. **Case Sensitivity (Windows vs Linux)**
**Problema:** Windows no distingue mayúsculas/minúsculas, pero Vercel (Linux) sí.

**Solución:**
```bash
# Configurar Git para ser case-sensitive
git config core.ignorecase false
```

### 2. **Tailwind en DevDependencies**
**Problema:** Vercel no instala devDependencies en producción.

**Solución:** Mover tailwindcss, postcss y autoprefixer a dependencies.

### 3. **NODE_ENV en Development**
**Problema:** Ejecutar en development mode causa problemas de rendimiento y seguridad.

**Solución:** Siempre usar NODE_ENV=production en Vercel.

## 📝 Checklist Pre-Deployment

Antes de hacer push a producción:

- [ ] Ejecutar `npm run build` localmente
- [ ] Verificar archivos en Git: `node check-git-files.js`
- [ ] Asegurar NODE_ENV=production en Vercel
- [ ] Limpiar caché de build en Vercel si hay problemas
- [ ] Verificar que todos los archivos estén committeados

## 🛠️ Scripts de Utilidad

### Verificar archivos en Git vs Sistema de archivos
```bash
node check-git-files.js
```

### Arreglar case sensitivity en Git
```bash
node fix-git-case.js
```

### Arreglar todos los imports automáticamente
```bash
node fix-imports.js
```

## 🔧 Configuración de Desarrollo

### Para nuevos desarrolladores:
```bash
# Clonar repo
git clone https://github.com/joshmen/handy-sales-crm.git

# Configurar Git
git config core.ignorecase false

# Instalar dependencias
npm install --force

# Verificar build
npm run build
```

## ⚠️ Mejores Prácticas

### 1. **Nombrado de Archivos**
- Siempre usar PascalCase para componentes: `Button.tsx`, `Card.tsx`
- Siempre usar camelCase para hooks: `useAuth.ts`, `useToast.tsx`
- Ser consistente con el case en imports

### 2. **Imports**
```typescript
// ✅ BIEN - Import directo
import { Button } from '@/components/ui/Button';

// ✅ BIEN - Barrel import (si existe index.ts)
import { Button, Card } from '@/components/ui';

// ❌ MAL - Case incorrecto
import { button } from '@/components/ui/button';
```

### 3. **Estructura de Carpetas**
```
src/
├── app/              # App Router pages
├── components/
│   ├── ui/          # Componentes UI reutilizables
│   │   └── index.ts # Barrel exports
│   └── layout/      # Componentes de layout
│       └── index.ts # Barrel exports
├── hooks/           # Custom hooks
│   └── index.ts     # Barrel exports
└── lib/             # Utilidades
```

## 🚨 Solución de Problemas Comunes

### Error: "Module not found"
1. Verificar el case del archivo
2. Verificar que el archivo esté en Git: `git ls-files | grep nombreArchivo`
3. Re-agregar si es necesario: `git add path/to/file.tsx`

### Error: "Cannot find module 'tailwindcss'"
1. Verificar que esté en dependencies (no devDependencies)
2. Ejecutar: `npm install tailwindcss@3.4.1 postcss autoprefixer --save`

### Build funciona local pero no en Vercel
1. Limpiar caché en Vercel
2. Verificar variables de entorno
3. Ejecutar: `node check-git-files.js`

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Proyecto en Vercel](https://vercel.com/joshmens-projects/handy-sales-crm)
- [Repositorio](https://github.com/joshmen/handy-sales-crm)

## 👥 Contacto

Si tienes problemas con el deployment, contacta al equipo de desarrollo.

---

*Última actualización: Enero 2025*
