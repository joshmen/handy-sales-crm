using HandySales.Application.Automations.DTOs;
using HandySales.Application.Automations.Interfaces;
using HandySales.Domain.Entities;
using HandySales.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HandySales.Infrastructure.Repositories.Automations;

public class AutomationRepository : IAutomationRepository
{
    private readonly HandySalesDbContext _db;

    public AutomationRepository(HandySalesDbContext db) => _db = db;

    public async Task<List<AutomationTemplateDto>> GetTemplatesWithTenantStatusAsync(int tenantId)
    {
        var templates = await _db.AutomationTemplates
            .AsNoTracking()
            .OrderBy(t => t.Orden)
            .ToListAsync();

        var tenantAutomations = await _db.TenantAutomations
            .AsNoTracking()
            .Where(ta => ta.TenantId == tenantId)
            .ToListAsync();

        return templates.Select(t =>
        {
            var ta = tenantAutomations.FirstOrDefault(a => a.TemplateId == t.Id);
            return new AutomationTemplateDto
            {
                Id = t.Id,
                Slug = t.Slug,
                Nombre = t.Nombre,
                Descripcion = t.Descripcion,
                DescripcionCorta = t.DescripcionCorta,
                Icono = t.Icono,
                Categoria = t.Categoria.ToString(),
                TriggerType = t.TriggerType.ToString(),
                ActionType = t.ActionType.ToString(),
                Tier = t.Tier.ToString(),
                Orden = t.Orden,
                Activada = ta?.Activo ?? false,
                ParamsJson = ta?.ParamsJson,
                DefaultParamsJson = t.DefaultParamsJson,
                UltimaEjecucion = ta?.LastExecutedAt,
                TotalEjecuciones = ta?.ExecutionCount ?? 0,
            };
        }).ToList();
    }

    public async Task<List<AutomationTemplateDto>> GetActiveByTenantAsync(int tenantId)
    {
        return await _db.TenantAutomations
            .AsNoTracking()
            .Include(ta => ta.Template)
            .Where(ta => ta.TenantId == tenantId && ta.Activo)
            .OrderBy(ta => ta.Template.Orden)
            .Select(ta => new AutomationTemplateDto
            {
                Id = ta.Template.Id,
                Slug = ta.Template.Slug,
                Nombre = ta.Template.Nombre,
                Descripcion = ta.Template.Descripcion,
                DescripcionCorta = ta.Template.DescripcionCorta,
                Icono = ta.Template.Icono,
                Categoria = ta.Template.Categoria.ToString(),
                TriggerType = ta.Template.TriggerType.ToString(),
                ActionType = ta.Template.ActionType.ToString(),
                Tier = ta.Template.Tier.ToString(),
                Orden = ta.Template.Orden,
                Activada = true,
                ParamsJson = ta.ParamsJson,
                DefaultParamsJson = ta.Template.DefaultParamsJson,
                UltimaEjecucion = ta.LastExecutedAt,
                TotalEjecuciones = ta.ExecutionCount,
            })
            .ToListAsync();
    }

    public async Task<AutomationTemplate?> GetTemplateBySlugAsync(string slug)
    {
        return await _db.AutomationTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Slug == slug);
    }

    public async Task<TenantAutomation?> GetTenantAutomationAsync(int tenantId, int templateId)
    {
        return await _db.TenantAutomations
            .FirstOrDefaultAsync(ta => ta.TenantId == tenantId && ta.TemplateId == templateId);
    }

    public async Task<List<TenantAutomation>> GetActiveTenantAutomationsAsync(int tenantId)
    {
        return await _db.TenantAutomations
            .Include(ta => ta.Template)
            .Where(ta => ta.TenantId == tenantId && ta.Activo)
            .ToListAsync();
    }

    public async Task<List<TenantAutomation>> GetAllActiveTenantAutomationsAsync()
    {
        return await _db.TenantAutomations
            .IgnoreQueryFilters()
            .Include(ta => ta.Template)
            .Where(ta => ta.Activo && ta.EliminadoEn == null
                      && ta.Template.TriggerType != AutomationTriggerType.Event)
            .ToListAsync();
    }

    public async Task<int> ActivarAsync(int tenantId, int templateId, int userId, string? paramsJson)
    {
        var existing = await _db.TenantAutomations
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(ta => ta.TenantId == tenantId && ta.TemplateId == templateId);

        if (existing != null)
        {
            // Reactivate
            existing.Activo = true;
            existing.ParamsJson = paramsJson;
            existing.ActivatedBy = userId;
            existing.EliminadoEn = null;
            existing.EliminadoPor = null;
            existing.ActualizadoEn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return existing.Id;
        }

        var entity = new TenantAutomation
        {
            TenantId = tenantId,
            TemplateId = templateId,
            ParamsJson = paramsJson,
            ActivatedBy = userId,
            Activo = true,
            CreadoEn = DateTime.UtcNow,
        };

        _db.TenantAutomations.Add(entity);
        await _db.SaveChangesAsync();
        return entity.Id;
    }

    public async Task<bool> DesactivarAsync(int tenantId, int templateId)
    {
        var entity = await _db.TenantAutomations
            .FirstOrDefaultAsync(ta => ta.TenantId == tenantId && ta.TemplateId == templateId && ta.Activo);

        if (entity == null) return false;

        entity.Activo = false;
        entity.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ConfigurarAsync(int tenantId, int templateId, string paramsJson)
    {
        var entity = await _db.TenantAutomations
            .FirstOrDefaultAsync(ta => ta.TenantId == tenantId && ta.TemplateId == templateId && ta.Activo);

        if (entity == null) return false;

        entity.ParamsJson = paramsJson;
        entity.ActualizadoEn = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<(List<AutomationExecutionDto> Items, int Total)> GetHistorialAsync(int tenantId, int page, int pageSize, string? slug = null)
    {
        var query = _db.AutomationExecutions
            .AsNoTracking()
            .Where(e => e.TenantId == tenantId);

        if (!string.IsNullOrEmpty(slug))
            query = query.Where(e => e.TemplateSlug == slug);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(e => e.EjecutadoEn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new AutomationExecutionDto
            {
                Id = e.Id,
                TemplateSlug = e.TemplateSlug,
                TemplateNombre = "", // Will be enriched below
                TriggerEntity = e.TriggerEntity,
                TriggerEntityId = e.TriggerEntityId,
                Status = e.Status.ToString(),
                ActionTaken = e.ActionTaken,
                ErrorMessage = e.ErrorMessage,
                EjecutadoEn = e.EjecutadoEn,
            })
            .ToListAsync();

        // Enrich with template names
        if (items.Count > 0)
        {
            var slugs = items.Select(i => i.TemplateSlug).Distinct().ToList();
            var templates = await _db.AutomationTemplates
                .AsNoTracking()
                .Where(t => slugs.Contains(t.Slug))
                .ToDictionaryAsync(t => t.Slug, t => t.Nombre);

            foreach (var item in items)
                item.TemplateNombre = templates.GetValueOrDefault(item.TemplateSlug, item.TemplateSlug);
        }

        return (items, total);
    }

    public async Task LogExecutionAsync(AutomationExecution execution)
    {
        _db.AutomationExecutions.Add(execution);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateLastExecutedAsync(int automationId)
    {
        var entity = await _db.TenantAutomations.FindAsync(automationId);
        if (entity != null)
        {
            entity.LastExecutedAt = DateTime.UtcNow;
            entity.ExecutionCount++;
            await _db.SaveChangesAsync();
        }
    }

    public async Task LogAndUpdateAsync(AutomationExecution execution, int automationId)
    {
        _db.AutomationExecutions.Add(execution);

        var entity = await _db.TenantAutomations.FindAsync(automationId);
        if (entity != null)
        {
            entity.LastExecutedAt = DateTime.UtcNow;
            entity.ExecutionCount++;
        }

        await _db.SaveChangesAsync();
    }
}
