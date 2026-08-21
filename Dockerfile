# ==============================
# FRONTEND BUILD
# ==============================

FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./frontend/

RUN cd frontend && npm ci

COPY frontend ./frontend

RUN cd frontend && npm run build


# ==============================
# PRODUCTION
# ==============================

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY backend/package*.json ./backend/

RUN cd backend && npm ci --omit=dev

COPY backend ./backend

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 8080

CMD ["sh", "-c", "cd backend && npm start"]