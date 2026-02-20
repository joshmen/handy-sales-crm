using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace HandySales.Tests.Integration.Announcements;

public class AnnouncementEndpointsTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly HttpClient _superAdminClient;

    public AnnouncementEndpointsTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();

        _superAdminClient = factory.CreateClient();
        _superAdminClient.DefaultRequestHeaders.Add("X-Test-SuperAdmin", "true");
    }

    // ══════════════════════════════════════════
    // Access Control
    // ══════════════════════════════════════════

    [Fact]
    public async Task GetAnnouncements_AdminUser_ReturnsForbid()
    {
        var response = await _client.GetAsync("/api/superadmin/announcements");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateAnnouncement_AdminUser_ReturnsForbid()
    {
        var dto = new { titulo = "Test", mensaje = "Msg", tipo = "Banner" };
        var response = await _client.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAnnouncement_AdminUser_ReturnsForbid()
    {
        var response = await _client.DeleteAsync("/api/superadmin/announcements/1");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ══════════════════════════════════════════
    // CRUD — SuperAdmin
    // ══════════════════════════════════════════

    [Fact]
    public async Task GetAnnouncements_SuperAdmin_ReturnsOkWithPagination()
    {
        var response = await _superAdminClient.GetAsync("/api/superadmin/announcements?page=1&pageSize=10");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.TryGetProperty("items", out _));
        Assert.True(json.TryGetProperty("total", out _));
        Assert.True(json.TryGetProperty("page", out _));
    }

    [Fact]
    public async Task CreateAnnouncement_Banner_ReturnsCreated()
    {
        var dto = new
        {
            titulo = "Test Banner",
            mensaje = "Mensaje de prueba",
            tipo = "Banner",
            prioridad = "Normal",
            displayMode = "Banner",
            isDismissible = true
        };

        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("id").GetInt32() > 0);
        Assert.Equal("Banner", json.GetProperty("tipo").GetString());
        Assert.Equal("Banner", json.GetProperty("displayMode").GetString());
    }

    [Fact]
    public async Task CreateAnnouncement_MissingTitulo_ReturnsBadRequest()
    {
        var dto = new { titulo = "", mensaje = "Msg", tipo = "Banner" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateAnnouncement_InvalidTipo_ReturnsBadRequest()
    {
        var dto = new { titulo = "Test", mensaje = "Msg", tipo = "InvalidType" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetAnnouncementById_SuperAdmin_ReturnsOk()
    {
        // Create first
        var createDto = new { titulo = "Detail Test", mensaje = "Detail Msg", tipo = "Banner" };
        var createRes = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", createDto);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        // Get by ID
        var response = await _superAdminClient.GetAsync($"/api/superadmin/announcements/{id}");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Detail Test", json.GetProperty("titulo").GetString());
    }

    [Fact]
    public async Task GetAnnouncementById_NotFound_Returns404()
    {
        var response = await _superAdminClient.GetAsync("/api/superadmin/announcements/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeleteAnnouncement_SuperAdmin_ExpiresAnnouncement()
    {
        // Create
        var dto = new { titulo = "To Expire", mensaje = "Will be expired", tipo = "Banner" };
        var createRes = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        // Delete (expire)
        var deleteRes = await _superAdminClient.DeleteAsync($"/api/superadmin/announcements/{id}");
        deleteRes.EnsureSuccessStatusCode();

        // Verify it's expired
        var getRes = await _superAdminClient.GetAsync($"/api/superadmin/announcements/{id}");
        var json = await getRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("activo").GetBoolean());
    }

    [Fact]
    public async Task DeleteAnnouncement_NotFound_Returns404()
    {
        var response = await _superAdminClient.DeleteAsync("/api/superadmin/announcements/99999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ══════════════════════════════════════════
    // DisplayMode Feature
    // ══════════════════════════════════════════

    [Fact]
    public async Task CreateAnnouncement_DisplayModeBanner_SavedCorrectly()
    {
        var dto = new { titulo = "DM Banner", mensaje = "Test", tipo = "Banner", displayMode = "Banner" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Banner", json.GetProperty("displayMode").GetString());
    }

    [Fact]
    public async Task CreateAnnouncement_DisplayModeNotification_SavedCorrectly()
    {
        var dto = new { titulo = "DM Notif", mensaje = "Test", tipo = "Banner", displayMode = "Notification" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Notification", json.GetProperty("displayMode").GetString());
    }

    [Fact]
    public async Task CreateAnnouncement_DisplayModeBoth_SavedCorrectly()
    {
        var dto = new { titulo = "DM Both", mensaje = "Test", tipo = "Banner", displayMode = "Both" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Both", json.GetProperty("displayMode").GetString());
    }

    [Fact]
    public async Task CreateAnnouncement_Maintenance_ForcesDisplayModeBanner()
    {
        var dto = new
        {
            titulo = "Maintenance DM",
            mensaje = "Test maintenance",
            tipo = "Maintenance",
            displayMode = "Both" // Should be forced to Banner
        };

        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Banner", json.GetProperty("displayMode").GetString());
    }

    [Fact]
    public async Task CreateAnnouncement_DefaultDisplayMode_IsBanner()
    {
        var dto = new { titulo = "Default DM", mensaje = "Test", tipo = "Banner" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Banner", json.GetProperty("displayMode").GetString());
    }

    // ══════════════════════════════════════════
    // Banner Endpoint — DisplayMode Filtering
    // ══════════════════════════════════════════

    [Fact]
    public async Task BannersEndpoint_BannerMode_IsVisible()
    {
        // Create with Banner displayMode
        var dto = new { titulo = "Visible Banner", mensaje = "Test", tipo = "Banner", displayMode = "Banner" };
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);

        // Fetch banners as Admin user
        var response = await _client.GetAsync("/api/notificaciones/banners");
        response.EnsureSuccessStatusCode();

        var banners = await response.Content.ReadFromJsonAsync<JsonElement>();
        var found = false;
        foreach (var b in banners.EnumerateArray())
        {
            if (b.GetProperty("titulo").GetString() == "Visible Banner")
            {
                found = true;
                break;
            }
        }
        Assert.True(found, "Banner with DisplayMode=Banner should appear in /banners endpoint");
    }

    [Fact]
    public async Task BannersEndpoint_NotificationMode_IsNotVisible()
    {
        // Create with Notification displayMode
        var dto = new { titulo = "Notif Only", mensaje = "Test", tipo = "Banner", displayMode = "Notification" };
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);

        // Fetch banners as Admin user
        var response = await _client.GetAsync("/api/notificaciones/banners");
        response.EnsureSuccessStatusCode();

        var banners = await response.Content.ReadFromJsonAsync<JsonElement>();
        var found = false;
        foreach (var b in banners.EnumerateArray())
        {
            if (b.GetProperty("titulo").GetString() == "Notif Only")
            {
                found = true;
                break;
            }
        }
        Assert.False(found, "Announcement with DisplayMode=Notification should NOT appear in /banners endpoint");
    }

    [Fact]
    public async Task BannersEndpoint_BothMode_IsVisible()
    {
        // Create with Both displayMode
        var dto = new { titulo = "Both Mode", mensaje = "Test", tipo = "Banner", displayMode = "Both" };
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);

        // Fetch banners as Admin user
        var response = await _client.GetAsync("/api/notificaciones/banners");
        response.EnsureSuccessStatusCode();

        var banners = await response.Content.ReadFromJsonAsync<JsonElement>();
        var found = false;
        foreach (var b in banners.EnumerateArray())
        {
            if (b.GetProperty("titulo").GetString() == "Both Mode")
            {
                found = true;
                break;
            }
        }
        Assert.True(found, "Announcement with DisplayMode=Both should appear in /banners endpoint");
    }

    [Fact]
    public async Task BannersEndpoint_ReturnsDisplayModeInResponse()
    {
        var dto = new { titulo = "DM Response", mensaje = "Test", tipo = "Banner", displayMode = "Both" };
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);

        var response = await _client.GetAsync("/api/notificaciones/banners");
        response.EnsureSuccessStatusCode();

        var banners = await response.Content.ReadFromJsonAsync<JsonElement>();
        foreach (var b in banners.EnumerateArray())
        {
            if (b.GetProperty("titulo").GetString() == "DM Response")
            {
                Assert.Equal("Both", b.GetProperty("displayMode").GetString());
                return;
            }
        }
        Assert.Fail("Banner 'DM Response' not found");
    }

    // ══════════════════════════════════════════
    // Notification Creation (DisplayMode = Notification | Both)
    // ══════════════════════════════════════════

    [Fact]
    public async Task CreateAnnouncement_NotificationMode_SetsSentCountGreaterThanZero()
    {
        var dto = new
        {
            titulo = "Notif SentCount",
            mensaje = "Should create notifications",
            tipo = "Banner",
            displayMode = "Notification"
        };

        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        // Verify sentCount > 0 via detail endpoint
        var detailRes = await _superAdminClient.GetAsync($"/api/superadmin/announcements/{id}");
        detailRes.EnsureSuccessStatusCode();
        var detail = await detailRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(detail.GetProperty("sentCount").GetInt32() > 0,
            "sentCount should be > 0 when DisplayMode=Notification");
    }

    [Fact]
    public async Task CreateAnnouncement_BothMode_SetsSentCountGreaterThanZero()
    {
        var dto = new
        {
            titulo = "Both SentCount",
            mensaje = "Should create both banner and notification",
            tipo = "Banner",
            displayMode = "Both"
        };

        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        // Verify sentCount > 0
        var detailRes = await _superAdminClient.GetAsync($"/api/superadmin/announcements/{id}");
        detailRes.EnsureSuccessStatusCode();
        var detail = await detailRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(detail.GetProperty("sentCount").GetInt32() > 0,
            "sentCount should be > 0 when DisplayMode=Both");
    }

    [Fact]
    public async Task CreateAnnouncement_BannerMode_HasZeroSentCount()
    {
        var dto = new
        {
            titulo = "Banner Zero Sent",
            mensaje = "Should NOT create notifications",
            tipo = "Banner",
            displayMode = "Banner"
        };

        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        // Verify sentCount = 0
        var detailRes = await _superAdminClient.GetAsync($"/api/superadmin/announcements/{id}");
        detailRes.EnsureSuccessStatusCode();
        var detail = await detailRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, detail.GetProperty("sentCount").GetInt32());
    }

    // ══════════════════════════════════════════
    // Targeted Announcements (Tenant/Role Filtering)
    // ══════════════════════════════════════════

    [Fact]
    public async Task CreateAnnouncement_TargetedToTenant1_Tenant1GetsBanner()
    {
        var dto = new
        {
            titulo = "Tenant1 Only",
            mensaje = "Only for tenant 1",
            tipo = "Banner",
            displayMode = "Banner",
            targetTenantIds = new[] { 1 }
        };
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);

        // Tenant 1 admin (default _client is tenant 1, user 1)
        var response = await _client.GetAsync("/api/notificaciones/banners");
        response.EnsureSuccessStatusCode();
        var banners = await response.Content.ReadFromJsonAsync<JsonElement>();
        var found = false;
        foreach (var b in banners.EnumerateArray())
            if (b.GetProperty("titulo").GetString() == "Tenant1 Only") found = true;
        Assert.True(found, "Tenant 1 should see the targeted banner");
    }

    // ══════════════════════════════════════════
    // Banner Dismiss
    // ══════════════════════════════════════════

    [Fact]
    public async Task DismissBanner_RemovesFromUserView()
    {
        // Create dismissible banner
        var dto = new { titulo = "Dismiss Test", mensaje = "Dismiss me", tipo = "Banner", displayMode = "Banner", isDismissible = true };
        var createRes = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        // Dismiss as Admin
        var dismissRes = await _client.PostAsync($"/api/notificaciones/banners/{id}/dismiss", null);
        dismissRes.EnsureSuccessStatusCode();

        // Fetch banners — dismissed one should be gone
        var response = await _client.GetAsync("/api/notificaciones/banners");
        var banners = await response.Content.ReadFromJsonAsync<JsonElement>();
        var found = false;
        foreach (var b in banners.EnumerateArray())
            if (b.GetProperty("titulo").GetString() == "Dismiss Test") found = true;
        Assert.False(found, "Dismissed banner should not appear in user's view");
    }

    [Fact]
    public async Task DismissBanner_NonDismissible_ReturnsNotFound()
    {
        var dto = new { titulo = "No Dismiss", mensaje = "Cannot dismiss", tipo = "Banner", displayMode = "Banner", isDismissible = false };
        var createRes = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        var created = await createRes.Content.ReadFromJsonAsync<JsonElement>();
        var id = created.GetProperty("id").GetInt32();

        var dismissRes = await _client.PostAsync($"/api/notificaciones/banners/{id}/dismiss", null);
        Assert.Equal(HttpStatusCode.NotFound, dismissRes.StatusCode);
    }

    [Fact]
    public async Task DismissBanner_NonExistent_ReturnsNotFound()
    {
        var response = await _client.PostAsync("/api/notificaciones/banners/99999/dismiss", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ══════════════════════════════════════════
    // Maintenance Mode
    // ══════════════════════════════════════════

    [Fact]
    public async Task ActivateMaintenance_SuperAdmin_ReturnsOk()
    {
        var dto = new { message = "Test maintenance" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/maintenance", dto);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("maintenance").GetBoolean());
    }

    [Fact]
    public async Task ActivateMaintenance_AdminUser_ReturnsForbid()
    {
        var dto = new { message = "Test" };
        var response = await _client.PostAsJsonAsync("/api/superadmin/maintenance", dto);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task DeactivateMaintenance_SuperAdmin_ReturnsOk()
    {
        // Activate first
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/maintenance", new { message = "Activate" });

        // Deactivate
        var response = await _superAdminClient.DeleteAsync("/api/superadmin/maintenance");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(json.GetProperty("maintenance").GetBoolean());
    }

    // ══════════════════════════════════════════
    // DisplayMode in List Response
    // ══════════════════════════════════════════

    [Fact]
    public async Task ListAnnouncements_IncludesDisplayModeField()
    {
        // Create announcements with different display modes
        await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements",
            new { titulo = "List DM1", mensaje = "Test", tipo = "Banner", displayMode = "Notification" });

        var response = await _superAdminClient.GetAsync("/api/superadmin/announcements?page=1&pageSize=50");
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("items");
        foreach (var item in items.EnumerateArray())
        {
            if (item.GetProperty("titulo").GetString() == "List DM1")
            {
                Assert.Equal("Notification", item.GetProperty("displayMode").GetString());
                return;
            }
        }
        Assert.Fail("Announcement 'List DM1' not found in list");
    }

    [Fact]
    public async Task CreateAnnouncement_TituloTooLong_ReturnsBadRequest()
    {
        var dto = new { titulo = new string('A', 151), mensaje = "Test", tipo = "Banner" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateAnnouncement_MensajeTooLong_ReturnsBadRequest()
    {
        var dto = new { titulo = "Test", mensaje = new string('B', 501), tipo = "Banner" };
        var response = await _superAdminClient.PostAsJsonAsync("/api/superadmin/announcements", dto);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
