# BandMate

A music collaboration platform for bands to create and share music together. Features real-time collaboration, audio waveform visualization, file management, and project organization.

## Quick Start

### Option 1: Docker (Recommended)

```bash
docker run -d \
  --name bandmate \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -e JWT_ACCESS_SECRET="your-secret-here" \
  -e JWT_REFRESH_SECRET="your-refresh-secret" \
  grimothy/bandmate:latest
```

Open http://localhost:3000 and login with `admin@bandmate.local` / `admin`

### Option 2: Docker Compose

```bash
git clone https://github.com/Grimothy/BandMate.git
cd BandMate
docker-compose up -d
```

### Option 3: Local Development

```bash
# Backend
cd backend
npm install
cp ../.env.example .env
npm run db:push && npm run db:seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Configuration

### Required Variables

| Variable | Description |
|----------|-------------|
| `JWT_ACCESS_SECRET` | Secret for signing access tokens. Use a random string. |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens. Use a different random string. |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `development` | Set to `production` for deployments |
| `DATABASE_URL` | `file:./data/bandmate.db` | SQLite database path |

### Admin User

Initial admin credentials (used when seeding the database):

| Variable | Default |
|----------|---------|
| `ADMIN_EMAIL` | `admin@bandmate.local` |
| `ADMIN_PASSWORD` | `admin` |

### Reverse Proxy

If running behind nginx, Traefik, or another reverse proxy:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:3000` | Your public-facing URL. Used for email links and OAuth redirects. |

Example for a reverse proxy setup:
```bash
-e APP_URL="https://bandmate.yourdomain.com"
```

### Email Notifications (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_ENABLED` | `false` | Set to `true` to enable |
| `EMAIL_HOST` | `smtp.example.com` | SMTP server |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_SECURE` | `false` | `true` for port 465 (SSL) |
| `EMAIL_USER` | - | SMTP username |
| `EMAIL_PASS` | - | SMTP password |
| `EMAIL_FROM` | `BandMate <noreply@bandmate.local>` | Sender address |

### Google OAuth (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_OAUTH_ENABLED` | `false` | Set to `true` to enable |
| `GOOGLE_CLIENT_ID` | - | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | - | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3000/api/auth/google/callback` | OAuth callback URL |

---

## File Upload Limits

These limits are built into the application:

| File Type | Max Size | Formats |
|-----------|----------|---------|
| Images | 5 MB | JPEG, PNG, GIF, WebP |
| Audio | 100 MB | MP3, WAV, OGG, FLAC, AAC, M4A |
| Stems (ZIP) | 500 MB | ZIP |

---

## Data Persistence

Mount these volumes to persist data:

```yaml
volumes:
  - ./data:/app/data      # SQLite database
  - ./uploads:/app/uploads # Uploaded files
```

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Radix UI, Socket.io, Wavesurfer.js

**Backend:** Node.js, Express, TypeScript, Prisma (SQLite), Socket.io, JWT auth

---

## License

MIT
