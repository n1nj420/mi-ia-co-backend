# Guía de Configuración de MI-IA.CO Backend

## Índice
1. [Prerequisitos](#prerequisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Variables de Entorno](#variables-de-entorno)
4. [Base de Datos](#base-de-datos)
5. [Servicios Externos](#servicios-externos)
6. [Testing](#testing)
7. [Despliegue](#despliegue)
8. [Solución de Problemas](#solución-de-problemas)

## Prerequisitos

### Software Requerido
- **Node.js**: 16.0.0 o superior
- **npm**: 7.0.0 o superior
- **PostgreSQL**: 14.0 o superior (si no usas Supabase)
- **Git**: 2.0 o superior

### Cuentas Necesarias
- **Supabase**: Base de datos y autenticación
- **n8n Cloud**: Automatización de workflows
- **DeepSeek**: API de inteligencia artificial
- **Wompi**: Procesamiento de pagos (Colombia)
- **WhatsApp Business**: API de WhatsApp
- **Email SMTP**: Servicio de correo (Gmail recomendado)

## Configuración Inicial

### 1. Clonar el Repositorio
```bash
git clone <URL_DEL_REPOSITORIO>
cd mi-ia-backend
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales (ver sección [Variables de Entorno](#variables-de-entorno)).

### 4. Configurar Base de Datos
```bash
npm run db:setup
```

## Variables de Entorno

### Configuración del Servidor
```env
PORT=3000
NODE_ENV=development
```

### Supabase
```env
SUPABASE_URL=https://[tu-proyecto].supabase.co
SUPABASE_ANON_KEY=[tu-anon-key]
SUPABASE_SERVICE_KEY=[tu-service-key]
```

**Cómo obtener las credenciales de Supabase:**
1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a Settings → API
3. Copia la URL del proyecto
4. Copia el anon key y service role key

### DeepSeek API
```env
DEEPSEEK_API_KEY=[tu-deepseek-api-key]
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

**Cómo obtener la API key de DeepSeek:**
1. Regístrate en [deepseek.com](https://deepseek.com)
2. Ve a API Keys
3. Genera una nueva API key

### n8n
```env
N8N_API_KEY=[tu-n8n-api-key]
N8N_BASE_URL=https://[tu-usuario].cloud.n8n.io
```

**Cómo obtener las credenciales de n8n:**
1. Crea una cuenta en [n8n.cloud](https://n8n.cloud)
2. Ve a Settings → API Keys
3. Genera una nueva API key

### Wompi (Para pagos en Colombia)
```env
WOMPI_PUBLIC_KEY=[tu-wompi-public-key]
WOMPI_PRIVATE_KEY=[tu-wompi-private-key]
WOMPI_SECRET=[tu-wompi-webhook-secret]
```

**Cómo obtener las credenciales de Wompi:**
1. Regístrate en [wompi.co](https://wompi.co)
2. Ve a Configuración → Llaves API
3. Genera las llaves pública y privada
4. Configura el webhook secret

### Email (SMTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[tu-email]@gmail.com
SMTP_PASS=[tu-app-password]
```

**Cómo configurar Gmail SMTP:**
1. Activa 2FA en tu cuenta de Google
2. Genera una "App Password" en Google Account Settings
3. Usa esa contraseña en SMTP_PASS

### WhatsApp Business API
```env
WHATSAPP_API_KEY=[tu-whatsapp-api-key]
WHATSAPP_WEBHOOK_VERIFY_TOKEN=[token-de-verificacion]
```

**Cómo obtener las credenciales de WhatsApp:**
1. Crea una cuenta en Meta Business
2. Configura WhatsApp Business API
3. Obtén el access token
4. Genera un verify token para webhooks

### JWT
```env
JWT_SECRET=[jwt-secret-aleatorio]
```

Genera un string aleatorio de al menos 32 caracteres.

## Base de Datos

### Opción 1: Supabase (Recomendado)
1. Crea un proyecto en Supabase
2. Ejecuta el script SQL en el SQL Editor:
   ```sql
   -- Copia y pega el contenido de scripts/create-tables.sql
   ```
3. Verifica que las tablas se crearon correctamente

### Opción 2: PostgreSQL Local
1. Instala PostgreSQL
2. Crea una base de datos:
   ```bash
   createdb mi_ia_co
   ```
3. Ejecuta el script SQL:
   ```bash
   psql -d mi_ia_co -f scripts/create-tables.sql
   ```

## Servicios Externos

### Configuración de WhatsApp Business
1. Configura el webhook URL:
   ```
   https://tu-dominio.com/api/webhooks/whatsapp
   ```
2. Establece el verify token
3. Suscribe a los eventos de mensajes

### Configuración de Wompi Webhooks
1. Configura el webhook URL:
   ```
   https://tu-dominio.com/api/webhooks/wompi
   ```
2. Establece el event secret
3. Suscribe a los eventos de transacciones

### Configuración de n8n Workflows
1. Crea workflows base usando el servicio n8n
2. Configura las credenciales necesarias
3. Prueba los workflows en modo desarrollo

## Testing

### 1. Iniciar el Servidor
```bash
npm run dev
```

### 2. Verificar Health Check
```bash
curl http://localhost:3000/health
```

### 3. Importar Colección de Postman
1. Abre Postman
2. Importa el archivo `postman_collection.json`
3. Configura las variables de entorno
4. Ejecuta las peticiones de prueba

### 4. Ejecutar Tests
```bash
# Tests unitarios
npm test

# Tests con coverage
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## Despliegue

### Opción 1: Docker (Recomendado)

#### Construir la imagen
```bash
docker build -t mi-ia-backend .
```

#### Ejecutar el contenedor
```bash
docker run -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/logs:/app/logs \
  mi-ia-backend
```

#### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
```

### Opción 2: VPS/Droplet

#### 1. Preparar el servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para manejo de procesos
sudo npm install -g pm2
```

#### 2. Desplegar la aplicación
```bash
# Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd mi-ia-backend

# Instalar dependencias
npm install --production

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las credenciales de producción

# Iniciar con PM2
pm2 start src/index.js --name mi-ia-backend

# Configurar PM2 para inicio automático
pm2 startup
pm2 save
```

#### 3. Configurar Nginx (Reverse Proxy)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Opción 3: Heroku

#### 1. Configurar Heroku CLI
```bash
heroku login
heroku create mi-ia-backend
```

#### 2. Configurar variables de entorno
```bash
heroku config:set NODE_ENV=production
heroku config:set SUPABASE_URL=tu-supabase-url
# ... otras variables
```

#### 3. Desplegar
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

## Solución de Problemas

### Errores Comunes

#### Error de conexión a base de datos
```
Error: Database connection failed
```
**Solución**: Verifica las credenciales de Supabase y la conectividad de red.

#### Error de autenticación
```
Error: Invalid token
```
**Solución**: Asegúrate de incluir el token JWT en el header Authorization.

#### Error de webhook
```
Error: Webhook signature verification failed
```
**Solución**: Verifica que el webhook secret coincida con el configurado.

#### Error de n8n
```
Error: n8n workflow creation failed
```
**Solución**: Verifica la API key de n8n y que la cuenta tenga permisos.

### Logs y Debugging

#### Ver logs en desarrollo
```bash
npm run dev
```

#### Ver logs en producción (PM2)
```bash
pm2 logs mi-ia-backend
```

#### Ver logs de errores
```bash
tail -f logs/error.log
```

### Comandos Útiles

#### Reiniciar el servidor
```bash
pm2 restart mi-ia-backend
```

#### Monitorear recursos
```bash
pm2 monit
```

#### Actualizar la aplicación
```bash
git pull origin main
npm install --production
pm2 restart mi-ia-backend
```

## Configuración de Producción

### Seguridad
1. Usar HTTPS siempre
2. Configurar firewall (UFW)
3. Actualizar dependencias regularmente
4. Usar secrets management

### Performance
1. Configurar PM2 cluster mode
2. Usar CDN para assets estáticos
3. Implementar caching
4. Optimizar base de datos

### Monitoreo
1. Configurar health checks
2. Implementar error tracking
3. Configurar alertas
4. Monitorear métricas de negocio

## Próximos Pasos

Después de la configuración inicial:

1. **Configurar el frontend** para conectarse al backend
2. **Probar integraciones** con WhatsApp y pagos
3. **Configurar monitoreo** y alertas
4. **Implementar CI/CD** para despliegues automáticos
5. **Optimizar performance** según las métricas

## Soporte

Si encuentras problemas:

1. Revisa los logs de la aplicación
2. Consulta la documentación
3. Verifica las configuraciones
4. Contacta al equipo de soporte

---

**¡Listo! Tu backend de MI-IA.CO está configurado y listo para usar.** 🚀