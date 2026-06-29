namespace HandySuites.Chatbot.Api.Models;

/// <summary>Estado de una conversacion. int-backed para persistencia estable.</summary>
public enum ConversationStatus
{
    Waiting = 0,
    Bot = 1,
    Active = 2,
    Closed = 3
}

/// <summary>Modo de atencion: bot automatico o agente humano.</summary>
public enum ConversationMode
{
    Bot = 0,
    Human = 1
}

/// <summary>Autor de un mensaje del chat.</summary>
public enum MessageRole
{
    Visitor = 0,
    Bot = 1,
    Agent = 2,
    System = 3
}

/// <summary>Canal por el que llego la conversacion.</summary>
public enum ChatChannel
{
    Web = 0,
    Whatsapp = 1
}
