import React from 'react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { 
  Package, 
  Users, 
  ShoppingCart, 
  FileText, 
  Search,
  Plus,
  AlertCircle,
  Inbox,
  Calendar,
  Truck
} from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-sm'
  },
  md: {
    container: 'py-12',
    icon: 'h-12 w-12',
    title: 'text-xl',
    description: 'text-base'
  },
  lg: {
    container: 'py-16',
    icon: 'h-16 w-16',
    title: 'text-2xl',
    description: 'text-lg'
  }
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md'
}) => {
  const classes = sizeClasses[size]
  
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      classes.container,
      className
    )}>
      <div className="mx-auto mb-4">
        <Icon className={cn(
          'text-muted-foreground',
          classes.icon
        )} />
      </div>
      
      <h3 className={cn(
        'font-semibold text-foreground mb-2',
        classes.title
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          'text-muted-foreground mb-6 max-w-sm',
          classes.description
        )}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Predefined empty states for common scenarios
export const EmptyClients: React.FC<{
  onCreateClient?: () => void
  onImportClients?: () => void
}> = ({ onCreateClient, onImportClients }) => {
  return (
    <EmptyState
      icon={Users}
      title="No hay clientes registrados"
      description="Comienza agregando tu primer cliente para gestionar las ventas y rutas."
      action={onCreateClient ? {
        label: 'Agregar cliente',
        onClick: onCreateClient
      } : undefined}
      secondaryAction={onImportClients ? {
        label: 'Importar clientes',
        onClick: onImportClients
      } : undefined}
    />
  )
}

export const EmptyProducts: React.FC<{
  onCreateProduct?: () => void
  onImportProducts?: () => void
}> = ({ onCreateProduct, onImportProducts }) => {
  return (
    <EmptyState
      icon={Package}
      title="No hay productos en el catálogo"
      description="Agrega productos para comenzar a crear pedidos y gestionar el inventario."
      action={onCreateProduct ? {
        label: 'Agregar producto',
        onClick: onCreateProduct
      } : undefined}
      secondaryAction={onImportProducts ? {
        label: 'Importar productos',
        onClick: onImportProducts
      } : undefined}
    />
  )
}

export const EmptyOrders: React.FC<{
  onCreateOrder?: () => void
}> = ({ onCreateOrder }) => {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No hay pedidos registrados"
      description="Los pedidos aparecerán aquí una vez que comiences a registrar ventas."
      action={onCreateOrder ? {
        label: 'Crear pedido',
        onClick: onCreateOrder
      } : undefined}
    />
  )
}

export const EmptyVisits: React.FC<{
  onScheduleVisit?: () => void
}> = ({ onScheduleVisit }) => {
  return (
    <EmptyState
      icon={Calendar}
      title="No hay visitas programadas"
      description="Programa visitas a tus clientes para mantener un seguimiento efectivo."
      action={onScheduleVisit ? {
        label: 'Programar visita',
        onClick: onScheduleVisit
      } : undefined}
    />
  )
}

export const EmptyDeliveries: React.FC<{
  onCreateDelivery?: () => void
}> = ({ onCreateDelivery }) => {
  return (
    <EmptyState
      icon={Truck}
      title="No hay entregas programadas"
      description="Las entregas aparecerán aquí cuando los pedidos estén listos para envío."
      action={onCreateDelivery ? {
        label: 'Programar entrega',
        onClick: onCreateDelivery
      } : undefined}
    />
  )
}

export const EmptySearchResults: React.FC<{
  searchTerm?: string
  onClearSearch?: () => void
}> = ({ searchTerm, onClearSearch }) => {
  return (
    <EmptyState
      icon={Search}
      title="No se encontraron resultados"
      description={
        searchTerm 
          ? `No hay resultados para "${searchTerm}". Intenta con otros términos de búsqueda.`
          : "No se encontraron resultados para tu búsqueda."
      }
      action={onClearSearch ? {
        label: 'Limpiar búsqueda',
        onClick: onClearSearch,
        variant: 'outline'
      } : undefined}
      size="sm"
    />
  )
}

export const EmptyForms: React.FC<{
  onCreateForm?: () => void
}> = ({ onCreateForm }) => {
  return (
    <EmptyState
      icon={FileText}
      title="No hay formularios creados"
      description="Crea formularios personalizados para recopilar información específica de tus clientes."
      action={onCreateForm ? {
        label: 'Crear formulario',
        onClick: onCreateForm
      } : undefined}
    />
  )
}

export const ErrorState: React.FC<{
  title?: string
  description?: string
  onRetry?: () => void
}> = ({ 
  title = "Algo salió mal",
  description = "Ocurrió un error inesperado. Por favor intenta de nuevo.",
  onRetry
}) => {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={onRetry ? {
        label: 'Reintentar',
        onClick: onRetry
      } : undefined}
    />
  )
}

// Card variant for smaller spaces
interface EmptyCardProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyCard: React.FC<EmptyCardProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className
}) => {
  return (
    <div className={cn(
      'p-6 border rounded-lg bg-card text-center',
      className
    )}>
      <div className="mx-auto mb-3">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      
      <h4 className="font-medium text-foreground mb-1">
        {title}
      </h4>
      
      {description && (
        <p className="text-sm text-muted-foreground mb-4">
          {description}
        </p>
      )}
      
      {action && (
        <Button
          onClick={action.onClick}
          size="sm"
          variant="outline"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
