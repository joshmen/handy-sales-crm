# Agent Strategy (Token Optimization)

> Extracted from CLAUDE.md — model selection guide for AI coding agents.

Use the appropriate model for each task type to optimize costs without sacrificing quality:

| Agent | Model | Tasks | Cost |
|-------|-------|-------|------|
| **Explorer** | Haiku | Search code, understand structure, count files, list folders | $0.25/M (60x cheaper) |
| **Mover** | Haiku | Move/copy files, create folders, rename | $0.25/M |
| **Builder** | Haiku | Compile, run tests, validate builds | $0.25/M |
| **Coder** | Sonnet | Write new code, fix bugs | $3/M (5x cheaper) |
| **Refactor** | Sonnet | Refactor code, improve structure | $3/M |
| **Tester** | Sonnet | Write tests, validate logic | $3/M |
| **Architect** | Opus | Design systems, critical decisions, complex debugging | $15/M (max quality) |

## How to Use

When requesting tasks, Claude will automatically select the appropriate agent:

- "explora los endpoints" → **Haiku** (Explorer)
- "mueve la carpeta X a Y" → **Haiku** (Mover)
- "compila el proyecto" → **Haiku** (Builder)
- "arregla el bug en AuthService" → **Sonnet** (Coder)
- "refactoriza el modulo de clientes" → **Sonnet** (Refactor)
- "escribe tests para PedidoService" → **Sonnet** (Tester)
- "disena la arquitectura de sync offline" → **Opus** (Architect)

## Tips for Optimal Token Usage

1. **Be specific**: "Fix null check in MobileAuthService.cs line 45" > "Fix auth bug"
2. **Divide large tasks**: Split into smaller, focused requests
3. **Use parallel agents**: Multiple Haiku explorers can run simultaneously
4. **Context in CLAUDE.md**: This file is always loaded - no extra tokens needed
