# VoiceConnect

VoiceConnect, Discord benzeri sesli iletişim platformu olarak geliştirilen bir web projesidir.

Projede kullanıcı kayıt/giriş sistemi, rol yapısı, kategorili ses kanalları, mikrofon/kamera/ekran paylaşımı arayüzü ve backend API yapısı hedeflenmektedir.

## Kullanılan Teknolojiler

### Frontend
- React
- TypeScript
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express.js
- TypeScript
- JWT Authentication
- bcryptjs
- dotenv

### Veritabanı ve Docker
- PostgreSQL
- Docker
- Docker Compose

## Proje Klasör Yapısı

```txt
VoiceConnect/
  frontend/
    src/
      pages/
      services/
      types/

  backend/
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      sockets/
      utils/

  database/
    schema.sql

  docker-compose.yml
  README.md