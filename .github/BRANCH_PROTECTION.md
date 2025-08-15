# Branch Protection Rules - HandySales CRM

## Configurar en GitHub después del primer push

### Para la rama `main`:

1. Ve a Settings → Branches
2. Add rule → Branch name pattern: `main`
3. Configurar:

#### ✅ Protect matching branches
- [x] Require a pull request before merging
  - [x] Require approvals: 1
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from CODEOWNERS

#### ✅ Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- Status checks requeridos:
  - `lint-and-test`
  - `deploy-preview`
  - `build`

#### ✅ Require conversation resolution before merging

#### ✅ Require signed commits (opcional)

#### ✅ Include administrators

#### ❌ Allow force pushes (NO marcar)

#### ❌ Allow deletions (NO marcar)

### Para la rama `develop` (opcional):

1. Add rule → Branch name pattern: `develop`
2. Configurar similar a main pero menos restrictivo:
   - No requiere aprobaciones
   - Solo requiere que pasen los tests

## Flujo de trabajo recomendado:

```
feature/* → develop → main
   ↓          ↓         ↓
Preview    Staging  Production
```

## Comandos útiles:

```bash
# Crear nueva feature
git checkout -b feature/nueva-funcionalidad

# Hacer PR a develop
git push origin feature/nueva-funcionalidad
# Crear PR en GitHub UI

# Después de merge a develop, hacer PR a main
git checkout develop
git pull
git checkout -b release/v1.0.1
git push origin release/v1.0.1
# Crear PR a main en GitHub UI
```
