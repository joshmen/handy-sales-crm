// Azure Database for MySQL - Flexible Server (Más barato)
// Para desplegar: az deployment group create --resource-group handysales-rg --template-file mysql-database.bicep

@description('Nombre del servidor MySQL')
param serverName string = 'handysales-mysql'

@description('Nombre del administrador')
param administratorLogin string = 'handyadmin'

@secure()
@description('Contraseña del administrador (mínimo 8 caracteres)')
param administratorLoginPassword string

@description('Ubicación de los recursos')
param location string = resourceGroup().location

@description('SKU del servidor (el más barato)')
param serverSku string = 'Standard_B1s' // 1 vCore, 2GB RAM - $14.60/mes

@description('Versión de MySQL')
param mysqlVersion string = '8.0'

@description('Tamaño del storage en GB')
param storageSizeGB int = 20 // Mínimo 20GB

@description('Backup retention en días')
param backupRetentionDays int = 7

resource mysqlServer 'Microsoft.DBforMySQL/flexibleServers@2023-06-30' = {
  name: serverName
  location: location
  sku: {
    name: serverSku
    tier: 'Burstable' // Burstable es el más barato
  }
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    version: mysqlVersion
    storage: {
      storageSizeGB: storageSizeGB
      iops: 360 // Mínimo para B1s
      autoGrow: 'Enabled'
      autoIoScaling: 'Enabled'
    }
    backup: {
      backupRetentionDays: backupRetentionDays
      geoRedundantBackup: 'Disabled' // Deshabilitar para ahorrar
    }
    highAvailability: {
      mode: 'Disabled' // Deshabilitar HA para ahorrar
    }
    network: {
      publicNetworkAccess: 'Enabled' // Permitir acceso público
    }
    maintenanceWindow: {
      customWindow: 'Enabled'
      dayOfWeek: 0 // Domingo
      startHour: 2 // 2 AM
      startMinute: 0
    }
  }

  tags: {
    Environment: 'Production'
    Project: 'HandySales'
    CostOptimized: 'true'
  }
}

// Base de datos principal (handy_erp)
resource mainDatabase 'Microsoft.DBforMySQL/flexibleServers/databases@2023-06-30' = {
  parent: mysqlServer
  name: 'handy_erp'
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_unicode_ci'
  }
}

// Base de datos de facturación (handy_billing)
resource billingDatabase 'Microsoft.DBforMySQL/flexibleServers/databases@2023-06-30' = {
  parent: mysqlServer
  name: 'handy_billing'
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_unicode_ci'
  }
}

// Regla de firewall para permitir servicios de Azure
resource firewallRuleAzure 'Microsoft.DBforMySQL/flexibleServers/firewallRules@2023-06-30' = {
  parent: mysqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Regla de firewall para permitir Container Instances (rango IP de Azure)
resource firewallRuleContainers 'Microsoft.DBforMySQL/flexibleServers/firewallRules@2023-06-30' = {
  parent: mysqlServer
  name: 'AllowContainerInstances'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

// Configuración para optimizar costos
resource serverConfiguration 'Microsoft.DBforMySQL/flexibleServers/configurations@2023-06-30' = {
  parent: mysqlServer
  name: 'innodb_buffer_pool_size'
  properties: {
    value: '134217728' // 128MB buffer pool (optimal for 2GB RAM)
    source: 'user-override'
  }
}

// Outputs
output serverName string = mysqlServer.name
output serverFQDN string = mysqlServer.properties.fullyQualifiedDomainName
output connectionString string = 'Server=${mysqlServer.properties.fullyQualifiedDomainName};Database=handy_erp;User=${administratorLogin};Password=${administratorLoginPassword};SslMode=Required;'
output billingConnectionString string = 'Server=${mysqlServer.properties.fullyQualifiedDomainName};Database=handy_billing;User=${administratorLogin};Password=${administratorLoginPassword};SslMode=Required;'

// Información de costos estimados
output estimatedMonthlyCost string = 'Aproximadamente $14.60 USD/mes (Standard_B1s + 20GB storage)'