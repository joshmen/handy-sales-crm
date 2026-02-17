namespace HandySales.Application.Usuarios.DTOs;

public class BulkOperationDto
{
    public List<int> UserIds { get; set; } = new();
}

public class BulkRoleAssignmentDto
{
    public List<int> UserIds { get; set; } = new();
    public int RoleId { get; set; }
}