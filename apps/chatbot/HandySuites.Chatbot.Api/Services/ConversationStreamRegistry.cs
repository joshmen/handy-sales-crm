using System.Collections.Concurrent;
using System.Threading.Channels;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>Evento empujado al canal SSE del visitante (lado widget).</summary>
public record VisitorEvent(string Type, string? Text = null, double? Confidence = null, object? Sources = null);

/// <summary>
/// Registro en memoria de suscriptores SSE por conversacion (canal de recepcion del visitante).
/// Single-instance MVP: si se escala horizontalmente migrar a Redis/LISTEN-NOTIFY (Fase 3).
/// El lado del agente usa SignalR (InboxHub), no este registro.
/// </summary>
public class ConversationStreamRegistry
{
    private readonly ConcurrentDictionary<int, ConcurrentDictionary<Guid, Channel<VisitorEvent>>> _subs = new();

    public (Guid id, ChannelReader<VisitorEvent> reader) Subscribe(int conversationId)
    {
        var id = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<VisitorEvent>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });
        var map = _subs.GetOrAdd(conversationId, _ => new ConcurrentDictionary<Guid, Channel<VisitorEvent>>());
        map[id] = channel;
        return (id, channel.Reader);
    }

    public void Unsubscribe(int conversationId, Guid id)
    {
        if (!_subs.TryGetValue(conversationId, out var map)) return;
        if (map.TryRemove(id, out var ch)) ch.Writer.TryComplete();
        if (map.IsEmpty) _subs.TryRemove(conversationId, out _);
    }

    public void Publish(int conversationId, VisitorEvent ev)
    {
        if (!_subs.TryGetValue(conversationId, out var map)) return;
        foreach (var ch in map.Values) ch.Writer.TryWrite(ev);
    }

    public bool HasSubscribers(int conversationId)
        => _subs.TryGetValue(conversationId, out var map) && !map.IsEmpty;
}
