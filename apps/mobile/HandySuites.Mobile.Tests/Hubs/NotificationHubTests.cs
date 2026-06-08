using System.Security.Claims;
using HandySuites.Mobile.Api.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace HandySuites.Mobile.Tests.Hubs;

public class NotificationHubTests
{
    private readonly Mock<ILogger<MobileNotificationHub>> _loggerMock = new();
    private readonly Mock<IGroupManager> _groupsMock = new();
    private readonly Mock<HubCallerContext> _contextMock = new();

    private MobileNotificationHub CreateHub(ClaimsPrincipal? user, string connectionId = "conn-1")
    {
        _contextMock.Setup(c => c.User).Returns(user);
        _contextMock.Setup(c => c.ConnectionId).Returns(connectionId);

        var hub = new MobileNotificationHub(_loggerMock.Object)
        {
            Context = _contextMock.Object,
            Groups = _groupsMock.Object,
        };
        return hub;
    }

    private static ClaimsPrincipal BuildUser(string? userId, string? tenantId, bool useSub = false)
    {
        var claims = new List<Claim>();
        if (userId != null)
        {
            var type = useSub ? "sub" : ClaimTypes.NameIdentifier;
            claims.Add(new Claim(type, userId));
        }
        if (tenantId != null)
        {
            claims.Add(new Claim("tenant_id", tenantId));
        }
        var identity = new ClaimsIdentity(claims, "Test");
        return new ClaimsPrincipal(identity);
    }

    [Fact]
    public async Task OnConnectedAsync_DeberiaAgregarAGruposTenantYUser_CuandoClaimsValidos()
    {
        // Arrange
        var user = BuildUser("300", "1");
        var hub = CreateHub(user, connectionId: "conn-abc");

        // Act
        var act = async () => await hub.OnConnectedAsync();

        // Assert
        await act.Should().NotThrowAsync();
        _groupsMock.Verify(
            g => g.AddToGroupAsync("conn-abc", "tenant:1", It.IsAny<CancellationToken>()),
            Times.Once);
        _groupsMock.Verify(
            g => g.AddToGroupAsync("conn-abc", "user:300", It.IsAny<CancellationToken>()),
            Times.Once);
        _contextMock.Verify(c => c.Abort(), Times.Never);
    }

    [Fact]
    public async Task OnConnectedAsync_DeberiaUsarSubClaim_CuandoNoHayNameIdentifier()
    {
        // Arrange
        var user = BuildUser("999", "2", useSub: true);
        var hub = CreateHub(user, connectionId: "conn-sub");

        // Act
        var act = async () => await hub.OnConnectedAsync();

        // Assert
        await act.Should().NotThrowAsync();
        _groupsMock.Verify(
            g => g.AddToGroupAsync("conn-sub", "tenant:2", It.IsAny<CancellationToken>()),
            Times.Once);
        _groupsMock.Verify(
            g => g.AddToGroupAsync("conn-sub", "user:999", It.IsAny<CancellationToken>()),
            Times.Once);
        _contextMock.Verify(c => c.Abort(), Times.Never);
    }

    [Fact]
    public async Task OnConnectedAsync_DeberiaAbortar_CuandoFaltanClaims()
    {
        // Arrange - missing tenant_id
        var user = BuildUser("300", tenantId: null);
        var hub = CreateHub(user, connectionId: "conn-bad");

        // Act
        var act = async () => await hub.OnConnectedAsync();

        // Assert
        await act.Should().NotThrowAsync();
        _contextMock.Verify(c => c.Abort(), Times.AtLeastOnce);
        _groupsMock.Verify(
            g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task OnDisconnectedAsync_DeberiaCompletarSinError_AunSinClaims()
    {
        // Arrange - null user simulates anonymous/expired token at disconnect
        var hub = CreateHub(user: null, connectionId: "conn-x");

        // Act
        var act = async () => await hub.OnDisconnectedAsync(new Exception("boom"));

        // Assert
        await act.Should().NotThrowAsync();
        _groupsMock.Verify(
            g => g.AddToGroupAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
