using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HandySuites.Chatbot.Api.Hubs;

/// <summary>
/// Hub de la bandeja del agente (consola SA). Solo SUPER_ADMIN. El JWT llega por
/// query ?access_token= (el navegador no manda header en WebSocket/SSE).
/// Grupos: "agents" (todos los agentes conectados) y "conv:{id}" (hilo abierto).
/// El chatbot empuja InboxWaiting / VisitorMessage / Closed a estos grupos.
/// </summary>
[Authorize(Roles = "SUPER_ADMIN")]
public class InboxHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "agents");
        await base.OnConnectedAsync();
    }

    public Task JoinConversation(int conversationId)
        => Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");

    public Task LeaveConversation(int conversationId)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
}
