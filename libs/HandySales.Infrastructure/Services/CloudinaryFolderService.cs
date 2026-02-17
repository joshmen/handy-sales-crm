using HandySales.Application.CompanySettings.Interfaces;
using System.Text.RegularExpressions;

namespace HandySales.Infrastructure.Services
{
    public class CloudinaryFolderService : ICloudinaryFolderService
    {
        public string GenerateCompanyFolderName(int tenantId, string companyName)
        {
            // Limpiar el nombre de la empresa para usar como carpeta
            var cleanName = CleanFolderName(companyName);
            return $"handysales/company-{tenantId}-{cleanName}";
        }

        public async Task<bool> EnsureFolderStructureAsync(string folderPath)
        {
            // En Cloudinary, las carpetas se crean automáticamente cuando subes archivos
            // Pero podemos crear un archivo placeholder para asegurar que la estructura existe
            try
            {
                // Las carpetas en Cloudinary se crean automáticamente al subir archivos
                // Simplemente retornamos true ya que la estructura se creará al subir
                return await Task.FromResult(true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error ensuring folder structure: {ex.Message}");
                return false;
            }
        }

        public string GetLogoFolder(string companyFolder)
        {
            return $"{companyFolder}/logos";
        }

        public string GetProductsFolder(string companyFolder)
        {
            return $"{companyFolder}/products";
        }

        public string GetUsersFolder(string companyFolder)
        {
            return $"{companyFolder}/users";
        }

        public string GetDocumentsFolder(string companyFolder)
        {
            return $"{companyFolder}/documents";
        }

        private string CleanFolderName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                return "unnamed";

            // Convertir a lowercase y reemplazar espacios y caracteres especiales
            var cleaned = name.ToLowerInvariant();
            
            // Remover acentos y caracteres especiales
            cleaned = RemoveAccents(cleaned);
            
            // Solo permitir letras, números y guiones
            cleaned = Regex.Replace(cleaned, @"[^a-z0-9\-_]", "-");
            
            // Reemplazar múltiples guiones con uno solo
            cleaned = Regex.Replace(cleaned, @"-+", "-");
            
            // Remover guiones al inicio y final
            cleaned = cleaned.Trim('-');
            
            // Limitar longitud
            if (cleaned.Length > 30)
                cleaned = cleaned.Substring(0, 30).TrimEnd('-');

            return string.IsNullOrEmpty(cleaned) ? "company" : cleaned;
        }

        private string RemoveAccents(string text)
        {
            var accents = new Dictionary<char, char>
            {
                {'á', 'a'}, {'à', 'a'}, {'ä', 'a'}, {'â', 'a'}, {'ā', 'a'}, {'ã', 'a'},
                {'é', 'e'}, {'è', 'e'}, {'ë', 'e'}, {'ê', 'e'}, {'ē', 'e'},
                {'í', 'i'}, {'ì', 'i'}, {'ï', 'i'}, {'î', 'i'}, {'ī', 'i'},
                {'ó', 'o'}, {'ò', 'o'}, {'ö', 'o'}, {'ô', 'o'}, {'ō', 'o'}, {'õ', 'o'},
                {'ú', 'u'}, {'ù', 'u'}, {'ü', 'u'}, {'û', 'u'}, {'ū', 'u'},
                {'ñ', 'n'}, {'ç', 'c'}
            };

            return new string(text.Select(c => accents.ContainsKey(c) ? accents[c] : c).ToArray());
        }
    }
}