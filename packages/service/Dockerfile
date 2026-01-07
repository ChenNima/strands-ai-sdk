# Multi-stage build for Next.js + FastAPI application
FROM node:20-slim AS frontend-builder

# Install pnpm
RUN npm install -g pnpm@10.8.0

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy frontend source code
COPY . .

# Build Next.js app
RUN pnpm run build

RUN mkdir -p .next/standalone/.next \
&& cp -r .next/static .next/standalone/.next/

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including nginx and supervisor
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js (needed for Next.js)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Copy Python dependencies
COPY pyproject.toml .
COPY alembic.ini .

# Install Python dependencies
RUN pip install --no-cache-dir -e .

# Copy backend code
COPY api ./api
COPY migrations ./migrations

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./package.json

# Copy other necessary files
COPY next.config.js .
COPY components.json .

# Configure nginx
RUN echo 'server {\n\
    listen 80;\n\
    server_name _;\n\
    client_max_body_size 100M;\n\
\n\
    # API routes go to FastAPI\n\
    location /api/ {\n\
        proxy_pass http://127.0.0.1:8000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        proxy_buffering off;\n\
        proxy_cache_bypass $http_upgrade;\n\
    }\n\
\n\
    # Docs routes go to FastAPI\n\
    location /docs {\n\
        proxy_pass http://127.0.0.1:8000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    }\n\
\n\
    location /openapi.json {\n\
        proxy_pass http://127.0.0.1:8000;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    }\n\
\n\
    # All other routes go to Next.js\n\
    location / {\n\
        proxy_pass http://127.0.0.1:3000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
}\n\
' > /etc/nginx/sites-available/default

# Configure supervisor
RUN echo '[supervisord]\n\
nodaemon=true\n\
user=root\n\
logfile=/var/log/supervisor/supervisord.log\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[program:nginx]\n\
command=/usr/sbin/nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:fastapi]\n\
command=uvicorn api.index:app --host 127.0.0.1 --port 8000\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:nextjs]\n\
command=/usr/bin/env HOSTNAME="0.0.0.0" node server.js\n\
directory=/app/.next/standalone\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
' > /etc/supervisor/conf.d/services.conf

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV PYTHONUNBUFFERED=1

# Create log directory
RUN mkdir -p /var/log/supervisor

# Expose port 80 (nginx)
EXPOSE 80

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Run database migrations\n\
echo "Running database migrations..."\n\
alembic upgrade head || echo "Migration failed or no database configured"\n\
\n\
# Start supervisor to manage all services\n\
echo "Starting services with supervisor..."\n\
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
