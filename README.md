# MI-IA.CO Backend

Backend API para MI-IA.CO - Plataforma de empleados virtuales IA para WhatsApp que ayuda a pequeños negocios a automatizar citas, ventas, CRM y marketing.

## Características

- 🤖 **Bots de WhatsApp Inteligentes**: Crea empleados virtuales con IA
- 📅 **Gestión de Citas**: Integración con Google Calendar
- 💬 **Conversaciones Automatizadas**: Procesamiento con DeepSeek AI
- 📊 **Analytics en Tiempo Real**: Métricas detalladas de rendimiento
- 💳 **Pagos Seguros**: Integración con Wompi para Colombia
- 🔗 **Workflows Automatizados**: Integración con n8n

## Tecnologías

- **Backend**: Node.js + Express
- **Base de Datos**: PostgreSQL con Supabase
- **IA**: DeepSeek API
- **Automatización**: n8n
- **Pagos**: Wompi
- **Autenticación**: JWT + Supabase Auth

## Instalación

### Requisitos Previos

- Node.js 16+
- PostgreSQL 14+
- Cuenta Supabase
- Cuenta n8n cloud
- Cuenta Wompi (para producción)
- API Key de DeepSeek

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd mi-ia-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

4. **Configurar base de datos**
   ```bash
   # Ejecutar el script SQL en Supabase
   npm run db:setup
   ```

5. **Iniciar el servidor**
   ```bash
   # Modo desarrollo
   npm run dev

   # Modo producción
   npm start
   ```

## Variables de Entorno

```env
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://tusupabase.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# n8n
N8N_API_KEY=your_n8n_api_key
N8N_BASE_URL=https://tu-n8n.cloud.n8n.io

# Wompi
WOMPI_PUBLIC_KEY=your_wompi_public_key
WOMPI_PRIVATE_KEY=your_wompi_private_key
WOMPI_SECRET=your_wompi_webhook_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# JWT
JWT_SECRET=your_jwt_secret_key

# WhatsApp
WHATSAPP_API_KEY=your_whatsapp_api_key
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
```

## Estructura del Proyecto

```
mi-ia-backend/
├── src/
│   ├── routes/          # Rutas de la API
│   │   ├── auth.js      # Autenticación
│   │   ├── bots.js      # Gestión de bots
│   │   ├── webhooks.js  # Webhooks
│   │   ├── contacts.js  # Contactos
│   │   └── analytics.js # Analytics
│   ├── services/        # Servicios de integración
│   │   ├── supabase.js  # Base de datos
│   │   ├── deepseek.js  # IA
│   │   ├── n8n.js       # Automatización
│   │   ├── wompi.js     # Pagos
│   │   └── email.js     # Email
│   ├── middleware/      # Middleware
│   │   ├── auth.js      # Autenticación
│   │   └── errorHandler.js # Manejo de errores
│   ├── utils/           # Utilidades
│   │   └── logger.js    # Logging
│   └── index.js         # Punto de entrada
├── scripts/
│   ├── create-tables.sql # Esquema de base de datos
│   └── setup-database.js # Setup inicial
├── logs/                # Archivos de log
├── .env.example         # Ejemplo de variables de entorno
├── package.json         # Dependencias
└── README.md           # Este archivo
```

## API Endpoints

### Autenticación
- `POST /api/auth/signup` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Información del usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Bots
- `POST /api/bots/create` - Crear nuevo bot
- `GET /api/bots/` - Listar bots del usuario
- `GET /api/bots/:id` - Detalle de un bot
- `PATCH /api/bots/:id/status` - Actualizar estado del bot

### Contactos
- `GET /api/contacts/` - Listar contactos de un bot
- `GET /api/contacts/:id` - Detalle de un contacto con conversaciones

### Analytics
- `GET /api/analytics/dashboard` - Dashboard principal
- `GET /api/analytics/bots/:bot_id` - Analytics específicos de un bot

### Webhooks
- `POST /api/webhooks/whatsapp` - Webhook de WhatsApp
- `POST /api/webhooks/wompi` - Webhook de Wompi (pagos)
- `POST /api/webhooks/n8n` - Callbacks de n8n

## Flujo de Trabajo

### 1. Registro y Pago
1. Usuario se registra en la plataforma
2. Realiza pago a través de Wompi
3. Webhook confirma el pago y activa la cuenta

### 2. Creación de Bot
1. Usuario completa el wizard de configuración
2. Backend genera configuración con DeepSeek
3. Se crea workflow en n8n
4. Bot queda listo para recibir mensajes

### 3. Funcionamiento del Bot
1. Cliente envía mensaje por WhatsApp
2. Webhook lo recibe y activa workflow n8n
3. n8n procesa con IA y ejecuta acciones
4. Se guarda conversación en base de datos
5. Se envía respuesta al cliente

## Seguridad

- Autenticación JWT
- Rate limiting
- CORS configurado
- Verificación de firmas en webhooks
- Encriptación de datos sensibles
- Logs de auditoría

## Monitoreo

- Logging con Winston
- Health check endpoint
- Métricas de rendimiento
- Alertas de errores

## Despliegue

### Docker (Recomendado)

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### VPS/Heroku

1. Configurar variables de entorno
2. Instalar dependencias: `npm install`
3. Iniciar aplicación: `npm start`

## Testing

```bash
# Ejecutar tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Este proyecto está licenciado bajo MIT License.

## Soporte

Para soporte técnico o preguntas:
- Email: soporte@mi-ia.co
- Documentación: [Próximamente]
- Status: [Próximamente]

## Roadmap

- [ ] Integración con más proveedores de pago
- [ ] Soporte multi-idioma
- [ ] Dashboard de administración
- [ ] API para desarrolladores
- [ ] Integración con CRMs populares
- [ ] Más plantillas de bots pre-configurados

---

**MI-IA.CO** - Transformando negocios con inteligencia artificial 🤖✨