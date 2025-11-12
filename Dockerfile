FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p logs

# Cambiar permisos para que el usuario node pueda escribir en logs
RUN chown -R node:node /app

# Usuario no-root para seguridad
USER node

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Comando para iniciar la aplicación
CMD ["npm", "start"]