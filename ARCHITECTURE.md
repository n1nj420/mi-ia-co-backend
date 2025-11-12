# Arquitectura de MI-IA.CO Backend

## Visión General

MI-IA.CO es una plataforma SaaS que permite a pequeños negocios crear "empleados virtuales IA" que gestionan WhatsApp automáticamente para citas, ventas, CRM y marketing.

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (Landing + Dashboard)                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ API REST
┌─────────────────────▼───────────────────────────────────────┐
│                     BACKEND                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Express   │  │   Routes    │  │ Middleware  │         │
│  │   Server    │◄─┤             │◄─┤             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│           │                │                │               │
│  ┌────────▼────────────────▼────────────────▼────────┐      │
│  │              Services Layer                         │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │      │
│  │  │ Supabase    │  │ DeepSeek    │  │    n8n     │ │      │
│  │  │ Service     │  │ Service     │  │  Service   │ │      │
│  │  └─────────────┘  └─────────────┘  └────────────┘ │      │
│  │           │                │                │       │      │
│  │  ┌────────▼────────────────▼────────────────▼────────┐    │
│  │  │              External APIs                        │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │    │
│  │  │  │ Supabase    │  │ DeepSeek    │  │   Wompi    │ │    │
│  │  │  │ Database    │  │     AI      │  │  Payments  │ │    │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘ │    │
│  │  │                                                   │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │    │
│  │  │  │   WhatsApp  │  │    n8n      │  │   Email    │ │    │
│  │  │  │   Business  │  │ Workflows   │  │   SMTP     │ │    │
│  │  │  └─────────────┘  └─────────────┘  └────────────┘ │    │
│  │  └─────────────────────────────────────────────────────┘    │
│  └──────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Principales

### 1. Backend Server (Express.js)
- **Framework**: Express.js con middleware de seguridad
- **Autenticación**: JWT + Supabase Auth
- **Validación**: Joi para validación de datos
- **Logging**: Winston para logging estructurado
- **Rate Limiting**: Protección contra abuso

### 2. Base de Datos (Supabase/PostgreSQL)
- **Tablas principales**:
  - `users`: Usuarios registrados
  - `bots`: Bots de WhatsApp configurados
  - `contacts`: Contactos/clientes
  - `conversations`: Historial de conversaciones
  - `appointments`: Citas y reservas
  - `payments`: Registro de pagos

### 3. Servicios de Integración

#### Supabase Service
- Gestión de base de datos
- Autenticación de usuarios
- Real-time subscriptions (futuro)
- Row Level Security (RLS)

#### DeepSeek Service
- Generación de configuraciones de bots
- Procesamiento de mensajes con IA
- Clasificación de intenciones
- Generación de respuestas contextuales

#### n8n Service
- Creación de workflows automatizados
- Integración con WhatsApp Business API
- Procesamiento de mensajes
- Activación/desactivación de workflows

#### Wompi Service
- Procesamiento de pagos en Colombia
- Suscripciones recurrentes
- Verificación de webhooks
- Reembolsos

#### Email Service
- Envío de emails transaccionales
- Emails de bienvenida
- Confirmaciones de pago
- Notificaciones de soporte

### 4. Webhooks
- **WhatsApp**: Recibe mensajes de usuarios
- **Wompi**: Procesa confirmaciones de pago
- **n8n**: Callbacks de workflows

## Flujo de Datos

### Creación de Bot
```
Usuario → Dashboard → Backend → DeepSeek (genera config) → 
Backend → n8n (crea workflow) → Backend → Supabase (guarda bot)
```

### Procesamiento de Mensaje
```
WhatsApp → Webhook → n8n Workflow → Supabase (datos) → 
DeepSeek (IA) → n8n → WhatsApp (respuesta) → Supabase (log)
```

### Proceso de Pago
```
Usuario → Wompi Checkout → Pago → Webhook Wompi → 
Backend → Supabase (actualiza usuario) → Email (confirmación)
```

## Modelo de Datos

### User
```javascript
{
  id: UUID,
  email: String,
  name: String,
  subscription_status: 'trial' | 'active' | 'cancelled',
  subscription_tier: 'tier1' | 'tier2' | 'tier3',
  wompi_subscription_id: String,
  created_at: Timestamp
}
```

### Bot
```javascript
{
  id: UUID,
  user_id: UUID,
  name: String,
  business_type: String,
  description: String,
  config_json: JSONB,
  n8n_workflow_id: String,
  whatsapp_number: String,
  status: 'setup' | 'active' | 'paused',
  created_at: Timestamp
}
```

### Contact
```javascript
{
  id: UUID,
  bot_id: UUID,
  phone: String,
  name: String,
  status: 'lead' | 'customer' | 'inactive',
  metadata: JSONB,
  last_interaction: Timestamp
}
```

## Seguridad

### Autenticación
- JWT tokens con expiración
- Refresh tokens
- Supabase Auth integration

### Autorización
- Middleware de autenticación
- Verificación de propiedad de recursos
- Row Level Security en PostgreSQL

### Seguridad de API
- Rate limiting
- CORS configurado
- Helmet.js para headers de seguridad
- Validación de entrada con Joi

### Webhook Security
- Verificación de firmas (Wompi)
- Tokens de verificación (WhatsApp)
- API keys (n8n)

## Escalabilidad

### Horizontal
- Arquitectura stateless
- Load balancing ready
- Microservices-ready

### Vertical
- Optimización de queries
- Caching (futuro)
- CDN para assets

## Monitoreo

### Logging
- Winston para logs estructurados
- Diferentes niveles de log
- Logs rotativos

### Métricas
- Health check endpoint
- Analytics dashboard
- Performance monitoring

### Alertas
- Error tracking
- Performance alerts
- Business metrics

## Configuración de Entorno

### Desarrollo
- Variables de entorno locales
- Base de datos de desarrollo
- Modo debug activado

### Producción
- Variables de entorno seguras
- Base de datos productiva
- Logging a nivel info
- Rate limiting activado

## Mejores Prácticas

### Código
- ESLint para linting
- Jest para testing
- Documentación con JSDoc
- Error handling consistente

### Seguridad
- Nunca hardcodear credenciales
- Usar HTTPS siempre
- Validar todos los inputs
- Logs sin información sensible

### Performance
- Lazy loading cuando sea posible
- Optimización de queries
- Uso eficiente de memoria
- Caching estratégico

## Futuras Mejoras

### Arquitectura
- Microservicios
- Event-driven architecture
- CQRS pattern
- GraphQL API

### Features
- Multi-idioma
- Integración con más canales
- Machine learning avanzado
- Analytics predictivo

### Infraestructura
- Kubernetes
- Auto-scaling
- Multi-region
- CDN global