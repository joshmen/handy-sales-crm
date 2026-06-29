using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace HandySuites.Chatbot.Api.Data;

/// <summary>
/// Factory de diseño para dotnet-ef (genera migraciones sin arrancar el host web).
/// La cadena real la provee el env en runtime; aqui solo se usa para el modelo.
/// </summary>
public class DesignTimeChatDbContextFactory : IDesignTimeDbContextFactory<ChatDbContext>
{
    public ChatDbContext CreateDbContext(string[] args)
    {
        var conn = Environment.GetEnvironmentVariable("ConnectionStrings__ChatDb")
            ?? "Host=localhost;Port=5432;Database=handy_chat;Username=handy_user;Password=handy_pass;";
        var options = new DbContextOptionsBuilder<ChatDbContext>()
            .UseNpgsql(conn, o => o.UseVector())
            .UseSnakeCaseNamingConvention()
            .Options;
        return new ChatDbContext(options);
    }
}
