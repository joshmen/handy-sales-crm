using System.Security.Cryptography;
using System.Text;

namespace HandySales.Shared.Security;

/// <summary>
/// Checks passwords against the HIBP Pwned Passwords API using k-anonymity.
/// The actual password is NEVER sent to the API — only the first 5 chars of its SHA-1 hash.
/// </summary>
public class PwnedPasswordService
{
    private readonly HttpClient _http;

    public PwnedPasswordService(HttpClient http)
    {
        _http = http;
        _http.BaseAddress = new Uri("https://api.pwnedpasswords.com/");
        _http.DefaultRequestHeaders.Add("User-Agent", "HandySales-PasswordCheck");
    }

    /// <summary>
    /// Returns true if the password has been found in known data breaches.
    /// Uses k-anonymity: only sends first 5 chars of SHA-1 hash to the API.
    /// </summary>
    public async Task<bool> IsCompromisedAsync(string password)
    {
        try
        {
            var sha1Bytes = SHA1.HashData(Encoding.UTF8.GetBytes(password));
            var hash = Convert.ToHexString(sha1Bytes);
            var prefix = hash[..5];
            var suffix = hash[5..];

            var response = await _http.GetStringAsync($"range/{prefix}");

            // API returns lines like "SUFFIX:COUNT"
            return response.Contains(suffix, StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            // If the API is unreachable, don't block the user — fail open
            return false;
        }
    }
}
