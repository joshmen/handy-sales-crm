using System.Text.Json;

namespace HandySuites.Chatbot.Api.Services;

/// <summary>Opciones JSON compartidas para los frames SSE (camelCase, como espera el widget).</summary>
public static class ChatJson
{
    public static readonly JsonSerializerOptions Camel = new(JsonSerializerDefaults.Web);

    public static string S(object value) => JsonSerializer.Serialize(value, Camel);
}
