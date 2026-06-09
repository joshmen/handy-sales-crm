# Git hooks — HandySales

Pre-commit hooks ligeros para prevenir errores comunes.

## Instalacion (una sola vez por checkout)

```bash
git config core.hooksPath hooks
```

Esto le dice a git que use `hooks/` (committed) en lugar de `.git/hooks/` (local-only).

## Hooks incluidos

### `pre-commit`
Ejecuta [`gitleaks`](https://github.com/gitleaks/gitleaks) sobre los archivos staged
para detectar secrets antes del commit. Si `gitleaks` no esta instalado, avisa pero
no bloquea (el workflow CI `.github/workflows/secret-scan.yml` es el backstop).

**Instalar gitleaks**:
- macOS: `brew install gitleaks`
- Windows: `scoop install gitleaks` o `choco install gitleaks`
- Linux: descargar de https://github.com/gitleaks/gitleaks/releases

**Bypass de emergencia** (solo si REALMENTE sabes lo que haces):
```bash
git commit --no-verify
```

## Config

Las reglas viven en `.gitleaks.toml` en la raiz del repo. Incluyen rules para:
- Cloudinary URLs
- Stripe keys (sk_live, rk_live)
- SendGrid keys
- OpenAI keys
- JWT secrets en JSON config files

Allowlist para placeholders, dev connstrings, e2e auth state.
