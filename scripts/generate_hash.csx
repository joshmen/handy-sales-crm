#r "nuget: BCrypt.Net-Next, 4.0.3"

var password = "Test123!";
var hash = BCrypt.Net.BCrypt.HashPassword(password);
Console.WriteLine($"Password: {password}");
Console.WriteLine($"Hash: {hash}");
Console.WriteLine($"Verify: {BCrypt.Net.BCrypt.Verify(password, hash)}");
