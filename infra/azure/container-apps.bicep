// Azure Container Apps - HandySales Production Infrastructure
// Para desplegar: az deployment group create --resource-group handysales-rg --template-file container-apps.bicep --parameters mysqlPassword=xxx jwtSecretKey=xxx cloudinaryUrl=xxx

@description('Ubicación de los recursos')
param location string = 'mexicocentral' // Querétaro datacenter

@description('Nombre del entorno de Container Apps')
param environmentName string = 'handysales-env'

@description('Contraseña del servidor MySQL')
@secure()
param mysqlPassword string

@description('Clave secreta JWT')
@secure()
param jwtSecretKey string

@description('Registro de contenedores')
param containerRegistry string = 'handysales.azurecr.io'

@description('Tag de la imagen')
param imageTag string = 'latest'

@description('Nombre del servidor MySQL')
param mysqlServerName string = 'handysales-mysql'

@description('Usuario administrador MySQL')
param mysqlAdminUser string = 'handyadmin'

@description('URL de Cloudinary (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)')
@secure()
param cloudinaryUrl string

// ============================================
// MySQL Flexible Server
// ============================================
resource mysqlServer 'Microsoft.DBforMySQL/flexibleServers@2023-06-30' = {
  name: mysqlServerName
  location: location
  sku: {
    name: 'Standard_B1ms' // 1 vCore, 2GB RAM - Burstable
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: mysqlAdminUser
    administratorLoginPassword: mysqlPassword
    version: '8.0'
    storage: {
      storageSizeGB: 20
      iops: 360
      autoGrow: 'Enabled'
      autoIoScaling: 'Enabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
  tags: {
    Environment: 'Production'
    Project: 'HandySales'
  }
}

// Base de datos handy_erp
resource mainDatabase 'Microsoft.DBforMySQL/flexibleServers/databases@2023-06-30' = {
  parent: mysqlServer
  name: 'handy_erp'
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_unicode_ci'
  }
}

// Base de datos handy_billing
resource billingDatabase 'Microsoft.DBforMySQL/flexibleServers/databases@2023-06-30' = {
  parent: mysqlServer
  name: 'handy_billing'
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_unicode_ci'
  }
}

// Firewall rule para permitir servicios de Azure
resource firewallRuleAzure 'Microsoft.DBforMySQL/flexibleServers/firewallRules@2023-06-30' = {
  parent: mysqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ============================================
// Container Apps Environment
// ============================================
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${environmentName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
  tags: {
    Environment: 'Production'
    Project: 'HandySales'
  }
}

resource containerAppEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: environmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
  tags: {
    Environment: 'Production'
    Project: 'HandySales'
  }
}

// ============================================
// Container App - API Principal (.NET 8)
// ============================================
resource apiMainApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'api-main'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5000
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: [
        {
          name: 'mysql-password'
          value: mysqlPassword
        }
        {
          name: 'jwt-secret'
          value: jwtSecretKey
        }
        {
          name: 'cloudinary-url'
          value: cloudinaryUrl
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api-main'
          image: '${containerRegistry}/api-main:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ASPNETCORE_URLS'
              value: 'http://+:5000'
            }
            {
              name: 'ConnectionStrings__DefaultConnection'
              value: 'Server=${mysqlServer.properties.fullyQualifiedDomainName};Database=handy_erp;User=${mysqlAdminUser};Password=${mysqlPassword};SslMode=Required;'
            }
            {
              name: 'Jwt__Secret'
              secretRef: 'jwt-secret'
            }
            {
              name: 'Jwt__Issuer'
              value: 'HandySales'
            }
            {
              name: 'Jwt__Audience'
              value: 'HandySalesUsers'
            }
            {
              name: 'Jwt__ExpirationMinutes'
              value: '30'
            }
            {
              name: 'Cloudinary__Url'
              secretRef: 'cloudinary-url'
            }
            {
              name: 'Multitenancy__DefaultTenantId'
              value: '00000000-0000-0000-0000-000000000001'
            }
          ]
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 5000
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'readiness'
              httpGet: {
                path: '/health'
                port: 5000
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
  tags: {
    Environment: 'Production'
    Project: 'HandySales'
  }
}

// ============================================
// Container App - API Billing (.NET 9)
// ============================================
resource apiBillingApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'api-billing'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5001
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: [
        {
          name: 'mysql-password'
          value: mysqlPassword
        }
        {
          name: 'jwt-secret'
          value: jwtSecretKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api-billing'
          image: '${containerRegistry}/api-billing:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ASPNETCORE_URLS'
              value: 'http://+:5001'
            }
            {
              name: 'ConnectionStrings__BillingConnection'
              value: 'Server=${mysqlServer.properties.fullyQualifiedDomainName};Database=handy_billing;User=${mysqlAdminUser};Password=${mysqlPassword};SslMode=Required;'
            }
            {
              name: 'ConnectionStrings__MainConnection'
              value: 'Server=${mysqlServer.properties.fullyQualifiedDomainName};Database=handy_erp;User=${mysqlAdminUser};Password=${mysqlPassword};SslMode=Required;'
            }
            {
              name: 'Jwt__Secret'
              secretRef: 'jwt-secret'
            }
            {
              name: 'Jwt__Issuer'
              value: 'HandySales'
            }
            {
              name: 'Jwt__Audience'
              value: 'HandySalesUsers'
            }
            {
              name: 'Jwt__ExpirationMinutes'
              value: '30'
            }
          ]
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 5001
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'readiness'
              httpGet: {
                path: '/health'
                port: 5001
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '30'
              }
            }
          }
        ]
      }
    }
  }
  tags: {
    Environment: 'Production'
    Project: 'HandySales'
  }
}

// ============================================
// Container App - API Mobile (.NET 8)
// ============================================
resource apiMobileApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'api-mobile'
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 5002
        allowInsecure: false
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
      }
      secrets: [
        {
          name: 'mysql-password'
          value: mysqlPassword
        }
        {
          name: 'jwt-secret'
          value: jwtSecretKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'api-mobile'
          image: '${containerRegistry}/api-mobile:${imageTag}'
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: 'Production'
            }
            {
              name: 'ASPNETCORE_URLS'
              value: 'http://+:5002'
            }
            {
              name: 'ConnectionStrings__DefaultConnection'
              value: 'Server=${mysqlServer.properties.fullyQualifiedDomainName};Database=handy_erp;User=${mysqlAdminUser};Password=${mysqlPassword};SslMode=Required;'
            }
            {
              name: 'Jwt__Secret'
              secretRef: 'jwt-secret'
            }
            {
              name: 'Jwt__Issuer'
              value: 'HandySales'
            }
            {
              name: 'Jwt__Audience'
              value: 'HandySalesUsers'
            }
            {
              name: 'Jwt__ExpirationMinutes'
              value: '30'
            }
            {
              name: 'Multitenancy__DefaultTenantId'
              value: '00000000-0000-0000-0000-000000000001'
            }
          ]
          probes: [
            {
              type: 'liveness'
              httpGet: {
                path: '/health'
                port: 5002
              }
              initialDelaySeconds: 30
              periodSeconds: 30
              failureThreshold: 3
            }
            {
              type: 'readiness'
              httpGet: {
                path: '/health'
                port: 5002
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              failureThreshold: 3
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '100'
              }
            }
          }
        ]
      }
    }
  }
  tags: {
    Environment: 'Production'
    Project: 'HandySales'
  }
}

// ============================================
// Outputs
// ============================================
output mysqlServerFqdn string = mysqlServer.properties.fullyQualifiedDomainName
output apiMainUrl string = apiMainApp.properties.configuration.ingress.fqdn
output apiBillingUrl string = apiBillingApp.properties.configuration.ingress.fqdn
output apiMobileUrl string = apiMobileApp.properties.configuration.ingress.fqdn
output environmentId string = containerAppEnvironment.id
output logAnalyticsWorkspaceId string = logAnalytics.id
output estimatedMonthlyCost string = 'Aproximadamente $25-35 USD/mes (MySQL B1ms + 3 Container Apps con auto-scaling 0-2)'
