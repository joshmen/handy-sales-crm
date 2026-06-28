using HandySuites.Chatbot.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HandySuites.Chatbot.Api.Data;

/// <summary>
/// DbContext autonomo del chatbot (DB handy_chat, pgvector). NO referencia el ERP.
/// snake_case via EFCore.NamingConventions (configurado en Program.cs).
/// </summary>
public class ChatDbContext : DbContext
{
    public ChatDbContext(DbContextOptions<ChatDbContext> options) : base(options) { }

    public DbSet<KbDocument> KbDocuments => Set<KbDocument>();
    public DbSet<KbEmbedding> KbEmbeddings => Set<KbEmbedding>();
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<ChatMessage> Messages => Set<ChatMessage>();
    public DbSet<Lead> Leads => Set<Lead>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresExtension("vector");

        b.Entity<KbDocument>(e =>
        {
            e.HasMany(d => d.Embeddings).WithOne(x => x.Document!)
                .HasForeignKey(x => x.DocumentId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<KbEmbedding>(e =>
        {
            e.HasIndex(x => new { x.DocumentId, x.ChunkIndex }).IsUnique();
            // Indice HNSW para busqueda por similitud coseno (RAG).
            e.HasIndex(x => x.Embedding).HasMethod("hnsw").HasOperators("vector_cosine_ops");
        });

        b.Entity<Conversation>(e =>
        {
            e.HasIndex(x => x.PublicId).IsUnique();
            e.HasIndex(x => new { x.Status, x.ActualizadoEn });
            e.HasMany(x => x.Messages).WithOne(m => m.Conversation!)
                .HasForeignKey(m => m.ConversationId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ChatMessage>(e => e.HasIndex(x => new { x.ConversationId, x.CreadoEn }));

        b.Entity<Lead>(e =>
        {
            e.HasOne(x => x.Conversation).WithMany()
                .HasForeignKey(x => x.ConversationId).OnDelete(DeleteBehavior.SetNull);
        });

        base.OnModelCreating(b);
    }
}
