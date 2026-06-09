namespace HandySuites.Application.Common.Interfaces;

/// <summary>
/// Per-iteration savepoint scope used inside <see cref="ITransactionManager.ExecuteWithSavepointsAsync{T}"/>.
///
/// Each call to <see cref="TryRunInSavepointAsync"/> wraps the action in a database
/// SAVEPOINT. On failure, only that savepoint is rolled back — earlier iterations
/// that already committed within the same outer transaction are preserved, and the
/// outer transaction can continue and commit cleanly at the end.
///
/// This is the canonical EF Core pattern for batch processing with partial-failure
/// tolerance, documented in
/// <see href="https://learn.microsoft.com/en-us/ef/core/saving/transactions#using-savepoints"/>.
///
/// Use case (SyncService push loop): each mobile-pushed entity gets its own savepoint
/// so a single poison entity (FK violation, stale ID, validation failure) does not
/// roll back the entire batch. Surviving entities commit; failures are reported in
/// the response so the mobile can present them to the user instead of looping.
/// </summary>
public interface ISavepointScope
{
    /// <summary>
    /// Runs <paramref name="action"/> inside a database savepoint.
    /// Returns <c>(Committed: true, Error: null)</c> if the savepoint committed,
    /// or <c>(Committed: false, Error: ex)</c> with the captured exception if it was rolled back.
    ///
    /// The exception is NOT re-thrown — it is surfaced via the return so callers can
    /// record per-entity error metadata (entity type, id, message) into a response DTO
    /// without aborting the whole batch.
    ///
    /// On rollback, any EF change tracker entries left in Added/Modified/Deleted state
    /// by the failed action are detached, so they do not leak into subsequent savepoints
    /// or the final commit.
    ///
    /// <paramref name="savepointName"/> must be unique within the enclosing transaction.
    /// Use the entity type + a stable identifier (e.g., the mobile LocalId).
    ///
    /// If the underlying provider does not support savepoints (rare — both Npgsql and
    /// SQLite do, even in-memory), the implementation falls back to running inline:
    /// the action runs but rollback isolation is lost. In that degraded mode, callers
    /// should be aware that a thrown action leaves the outer transaction in a state
    /// that may roll back at commit time.
    /// </summary>
    Task<(bool Committed, Exception? Error)> TryRunInSavepointAsync(string savepointName, Func<Task> action);
}
