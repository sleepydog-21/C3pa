# Etapa 1: Compilación de la aplicación Angular con Node.js 20
FROM node:20-alpine AS build

WORKDIR /app

# Copiar manifiesto de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar código fuente
COPY . .

# Compilar para producción
RUN npm run build -- --configuration production

# Etapa 2: Servidor Web Nginx ligero y de alto rendimiento
FROM nginx:alpine

# Copiar archivos compilados al directorio de Nginx
COPY --from=build /app/dist/conect-frontend/browser /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
