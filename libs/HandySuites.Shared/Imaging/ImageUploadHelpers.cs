namespace HandySuites.Shared.Imaging;

/// <summary>
/// Helpers compartidos por endpoints de upload de imagen (main API + mobile API).
/// Magic byte validation defense-in-depth + extracción de public_id Cloudinary
/// para borrar avatares anteriores. SVG explícitamente rechazado: aunque sea
/// "imagen", es XML ejecutable en browsers.
///
/// NOTA: este módulo NO depende de ASP.NET Core (IFormFile) para mantener
/// HandySuites.Shared agnostic del framework. Cada endpoint pasa los bytes
/// del header (12 bytes) ya extraídos del IFormFile/multipart.
/// </summary>
public static class ImageUploadHelpers
{
    /// <summary>Tamaño máximo de avatar en bytes (5 MB).</summary>
    public const long MaxAvatarBytes = 5 * 1024 * 1024;

    /// <summary>Content types permitidos para avatares.</summary>
    public static readonly string[] AllowedAvatarContentTypes =
    {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    };

    /// <summary>
    /// Verifica que los primeros bytes correspondan a JPEG/PNG/GIF/WebP.
    /// Los callers leen los primeros 12 bytes del IFormFile/stream y los pasan.
    /// </summary>
    public static bool ValidateImageMagicBytes(byte[] bytes, out string detectedFormat)
    {
        detectedFormat = "unknown";
        if (bytes.Length < 12) return false;

        // JPEG: FF D8 FF
        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF) { detectedFormat = "jpeg"; return true; }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47
            && bytes[4] == 0x0D && bytes[5] == 0x0A && bytes[6] == 0x1A && bytes[7] == 0x0A)
        { detectedFormat = "png"; return true; }
        // GIF: 47 49 46 38 (GIF8)
        if (bytes[0] == 0x47 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x38) { detectedFormat = "gif"; return true; }
        // WebP: RIFF....WEBP
        if (bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46
            && bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
        { detectedFormat = "webp"; return true; }

        return false;
    }

    /// <summary>
    /// Extrae el public_id de una URL Cloudinary. Necesario para borrar
    /// avatares anteriores antes de subir el nuevo.
    /// Formato URL: https://res.cloudinary.com/{cloud}/image/upload/{trans}/{folder}/{publicId}.{ext}
    /// </summary>
    public static string ExtractPublicIdFromCloudinaryUrl(string url)
    {
        if (string.IsNullOrEmpty(url)) return string.Empty;

        try
        {
            var uri = new Uri(url);
            var segments = uri.AbsolutePath.Split('/');

            var uploadIndex = Array.IndexOf(segments, "upload");
            if (uploadIndex == -1 || uploadIndex >= segments.Length - 1)
                return string.Empty;

            var fileWithExt = segments[segments.Length - 1];
            var lastDotIndex = fileWithExt.LastIndexOf('.');

            if (lastDotIndex > 0)
            {
                var publicIdPart = fileWithExt.Substring(0, lastDotIndex);

                // Incluir la estructura de carpetas, saltando transformaciones
                // tipo `v1234567` (versionado Cloudinary).
                var folderParts = new List<string>();
                for (int i = uploadIndex + 1; i < segments.Length - 1; i++)
                {
                    if (!segments[i].StartsWith("v") || !int.TryParse(segments[i].Substring(1), out _))
                    {
                        folderParts.Add(segments[i]);
                    }
                }

                if (folderParts.Count > 0)
                {
                    return string.Join("/", folderParts) + "/" + publicIdPart;
                }

                return publicIdPart;
            }

            return string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }
}
