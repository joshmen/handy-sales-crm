using System.Text;
using Amazon.KeyManagementService;
using Amazon.KeyManagementService.Model;
using HandySuites.Billing.Api.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace HandySuites.Billing.Tests.Services;

/// <summary>
/// Unit tests para KmsEnvelopeEncryptionService.
/// Mock IAmazonKeyManagementService para no llamar AWS real.
/// Usa MemoryCache real para evitar mockear CreateEntry (engorroso).
/// </summary>
public class KmsEnvelopeEncryptionServiceTests
{
    private const string TestCmkArn = "arn:aws:kms:us-east-1:123456789012:key/test-cmk-id";
    private const string TestTenantId = "tenant-test-123";

    // 32-byte test DEK (AES-256 key)
    private static byte[] TestDekBytes() =>
        Enumerable.Range(0, 32).Select(i => (byte)(i + 1)).ToArray();

    private static byte[] TestEncryptedDekBytes() =>
        Encoding.UTF8.GetBytes("encrypted-dek-blob-mock-payload!");

    private static KmsEnvelopeEncryptionService CreateService(
        Mock<IAmazonKeyManagementService> kmsMock,
        IMemoryCache? cache = null,
        Mock<ICertificateEncryptionService>? legacyMock = null,
        string? cmkArn = TestCmkArn)
    {
        var configDict = new Dictionary<string, string?>();
        if (cmkArn != null)
            configDict["KMS_CMK_ARN"] = cmkArn;

        var config = new ConfigurationBuilder().AddInMemoryCollection(configDict).Build();
        var memCache = cache ?? new MemoryCache(new MemoryCacheOptions());
        var legacy = legacyMock ?? new Mock<ICertificateEncryptionService>();

        return new KmsEnvelopeEncryptionService(
            kmsMock.Object,
            memCache,
            legacy.Object,
            config,
            NullLogger<KmsEnvelopeEncryptionService>.Instance);
    }

    private static void SetupGenerateDataKey(Mock<IAmazonKeyManagementService> kmsMock, byte[]? dek = null, byte[]? encrypted = null)
    {
        dek ??= TestDekBytes();
        encrypted ??= TestEncryptedDekBytes();
        kmsMock.Setup(k => k.GenerateDataKeyAsync(It.IsAny<GenerateDataKeyRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GenerateDataKeyResponse
            {
                Plaintext = new MemoryStream(dek),
                CiphertextBlob = new MemoryStream(encrypted),
                KeyId = TestCmkArn,
            });
    }

    private static void SetupDecrypt(Mock<IAmazonKeyManagementService> kmsMock, byte[]? dek = null)
    {
        dek ??= TestDekBytes();
        kmsMock.Setup(k => k.DecryptAsync(It.IsAny<DecryptRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DecryptResponse
            {
                Plaintext = new MemoryStream(dek),
                KeyId = TestCmkArn,
            });
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1. Constructor — falla si falta KMS_CMK_ARN
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public void Constructor_DeberiaLanzar_CuandoKmsCmkArnAusente()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>();

        var act = () => CreateService(kmsMock, cmkArn: null);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*KMS_CMK_ARN*");
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. EncryptAsync — formato KMS1 + longitud correcta
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task EncryptAsync_DeberiaGenerarDek_YRetornarCiphertextConFormatoKMS1()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>();
        SetupGenerateDataKey(kmsMock);
        var service = CreateService(kmsMock);
        var plaintext = Encoding.UTF8.GetBytes("hello world secret payload");

        var result = await service.EncryptAsync(TestTenantId, plaintext);

        result.Should().NotBeNull();
        result.Ciphertext.Should().NotBeNull();
        // Format: KMS1(4) || NONCE(12) || TAG(16) || CIPHERTEXT
        result.Ciphertext.Length.Should().Be(4 + 12 + 16 + plaintext.Length);
        // Marker = "KMS1"
        Encoding.ASCII.GetString(result.Ciphertext, 0, 4).Should().Be("KMS1");
        // Encrypted DEK Base64
        result.EncryptedDek.Should().NotBeNullOrEmpty();
        Convert.FromBase64String(result.EncryptedDek).Should().BeEquivalentTo(TestEncryptedDekBytes());
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. EncryptAsync — reusa DEK cacheado (1 sola call a KMS para 2 encrypts)
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task EncryptAsync_DeberiaReutilizarDekCacheado_EnLlamadasConsecutivasMismoTenant()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>();
        SetupGenerateDataKey(kmsMock);
        var service = CreateService(kmsMock);

        var r1 = await service.EncryptAsync(TestTenantId, Encoding.UTF8.GetBytes("first"));
        var r2 = await service.EncryptAsync(TestTenantId, Encoding.UTF8.GetBytes("second"));

        r1.Should().NotBeNull();
        r2.Should().NotBeNull();
        // GenerateDataKey debe haber sido invocado solo 1 vez
        kmsMock.Verify(k => k.GenerateDataKeyAsync(It.IsAny<GenerateDataKeyRequest>(), It.IsAny<CancellationToken>()),
            Times.Once());
        // Misma DEK encriptada en ambos resultados
        r1.EncryptedDek.Should().Be(r2.EncryptedDek);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. EncryptAsync — pasa TenantId en EncryptionContext
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task EncryptAsync_DeberiaUsarEncryptionContextConTenantId()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>();
        GenerateDataKeyRequest? capturedRequest = null;
        kmsMock.Setup(k => k.GenerateDataKeyAsync(It.IsAny<GenerateDataKeyRequest>(), It.IsAny<CancellationToken>()))
            .Callback<GenerateDataKeyRequest, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new GenerateDataKeyResponse
            {
                Plaintext = new MemoryStream(TestDekBytes()),
                CiphertextBlob = new MemoryStream(TestEncryptedDekBytes()),
                KeyId = TestCmkArn,
            });
        var service = CreateService(kmsMock);

        await service.EncryptAsync(TestTenantId, new byte[] { 1, 2, 3 });

        capturedRequest.Should().NotBeNull();
        capturedRequest!.KeyId.Should().Be(TestCmkArn);
        capturedRequest.KeySpec.Should().Be(DataKeySpec.AES_256);
        capturedRequest.EncryptionContext.Should().ContainKey("TenantId");
        capturedRequest.EncryptionContext["TenantId"].Should().Be(TestTenantId);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5. DecryptAsync — version 1 delega a legacy service
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task DecryptAsync_DeberiaDelegarALegacyService_CuandoEncryptionVersionEs1()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>(MockBehavior.Strict); // ningún KMS call esperado
        var legacyMock = new Mock<ICertificateEncryptionService>();
        var expectedPlaintext = Encoding.UTF8.GetBytes("legacy decrypted");
        legacyMock.Setup(l => l.Decrypt(It.IsAny<byte[]>())).Returns(expectedPlaintext);
        var service = CreateService(kmsMock, legacyMock: legacyMock);

        var ciphertext = new byte[] { 0xAA, 0xBB, 0xCC };
        var result = await service.DecryptAsync(TestTenantId, ciphertext, encryptedDek: "ignored", encryptionVersion: 1);

        result.Should().BeEquivalentTo(expectedPlaintext);
        legacyMock.Verify(l => l.Decrypt(ciphertext), Times.Once());
        kmsMock.VerifyNoOtherCalls();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 6. DecryptAsync — v2 con encryptedDek vacío → fallback a legacy
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task DecryptAsync_DeberiaDelegarALegacyService_CuandoEncryptedDekEsNullOEmpty()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>(MockBehavior.Strict);
        var legacyMock = new Mock<ICertificateEncryptionService>();
        var expectedPlaintext = Encoding.UTF8.GetBytes("legacy fallback");
        legacyMock.Setup(l => l.Decrypt(It.IsAny<byte[]>())).Returns(expectedPlaintext);
        var service = CreateService(kmsMock, legacyMock: legacyMock);

        // version=2 pero encryptedDek=null → debe ir a legacy
        var result = await service.DecryptAsync(TestTenantId, new byte[] { 1, 2 }, encryptedDek: null, encryptionVersion: 2);

        result.Should().BeEquivalentTo(expectedPlaintext);
        legacyMock.Verify(l => l.Decrypt(It.IsAny<byte[]>()), Times.Once());
        kmsMock.VerifyNoOtherCalls();

        // También con string.Empty
        var result2 = await service.DecryptAsync(TestTenantId, new byte[] { 1, 2 }, encryptedDek: "", encryptionVersion: 2);
        result2.Should().BeEquivalentTo(expectedPlaintext);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 7. Round-trip — Encrypt + Decrypt recupera plaintext original
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task EncryptThenDecrypt_RoundTrip_DeberiaRecuperarPlaintextOriginal()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>();
        SetupGenerateDataKey(kmsMock);
        SetupDecrypt(kmsMock); // por si decrypt path se usa (cache hit lo evita)
        var service = CreateService(kmsMock);

        var original = Encoding.UTF8.GetBytes("certificado privado del SAT con datos sensibles");

        // Encrypt
        var encResult = await service.EncryptAsync(TestTenantId, original);

        // Decrypt v2 con el encryptedDek devuelto
        // Nota: la DEK de generación se cachea en "dek:gen:{tenant}", no en "dek:dec:{tenant}".
        // Por lo tanto el path de Decrypt llamará a KMS DecryptAsync (que mockeamos).
        var decrypted = await service.DecryptAsync(TestTenantId, encResult.Ciphertext, encResult.EncryptedDek, encryptionVersion: 2);

        decrypted.Should().BeEquivalentTo(original);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 8. Retry — KMS falla 1 vez, retry exitoso a la 2da
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task EncryptAsync_DeberiaReintentar_CuandoKmsFalla_YEventualmenteExito()
    {
        var kmsMock = new Mock<IAmazonKeyManagementService>();
        kmsMock.SetupSequence(k => k.GenerateDataKeyAsync(It.IsAny<GenerateDataKeyRequest>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new KMSInternalException("transient failure"))
            .ReturnsAsync(new GenerateDataKeyResponse
            {
                Plaintext = new MemoryStream(TestDekBytes()),
                CiphertextBlob = new MemoryStream(TestEncryptedDekBytes()),
                KeyId = TestCmkArn,
            });
        var service = CreateService(kmsMock);

        var result = await service.EncryptAsync(TestTenantId, Encoding.UTF8.GetBytes("retry test"));

        result.Should().NotBeNull();
        result.Ciphertext.Length.Should().BeGreaterThan(0);
        // Debe haberse llamado 2 veces (1 fallo + 1 éxito)
        kmsMock.Verify(k => k.GenerateDataKeyAsync(It.IsAny<GenerateDataKeyRequest>(), It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }
}
