<!-- Context: standards/workflows/deployment.md -->

# Deployment Workflow

## Core Idea
CJ runs builds and tests from a separate directory (`_Test-BandMate`) to keep production data isolated from development. All Docker operations happen there.

## Key Points
- **Source code**: `/home/cj/Documents/GitHub/BandMate`
- **Test/Deploy directory**: `/home/cj/Documents/GitHub/_Test-BandMate`
- **Dev URL**: `https://dev-bandmate.bearald.com` (reverse proxy via openresty)
- **Local image tag**: `bandmate:local` (not `grimothy/bandmate:latest`)

## Directory Structure

```
~/Documents/GitHub/
├── BandMate/              # Source code (development)
│   ├── backend/
│   ├── frontend/
│   ├── Dockerfile
│   └── Dockerfile.test
│
└── _Test-BandMate/        # Deployment directory
    ├── build.sh           # Build + test + create image
    ├── test.sh            # Run tests only
    ├── docker-compose.yml # Uses bandmate:local image
    ├── data/              # SQLite database (persistent)
    └── uploads/           # User uploads (persistent)
```

## Build & Deploy Commands

### Full Build (Tests + Docker Image)
```bash
cd ~/Documents/GitHub/_Test-BandMate
./build.sh
```
This script:
1. Runs tests in Docker (`Dockerfile.test`)
2. Stops/removes existing container
3. Builds new image as `bandmate:local`

### Run Tests Only
```bash
cd ~/Documents/GitHub/_Test-BandMate
./test.sh
```

### Start Container
```bash
cd ~/Documents/GitHub/_Test-BandMate
docker compose up -d
```

### View Logs
```bash
docker logs bandmate --tail 50 -f
```

### Stop Container
```bash
docker compose down
# or
docker stop bandmate && docker rm bandmate
```

## Pre-Deploy Checklist

Before running `./build.sh`:
1. Ensure no processes using ports 3000/5173:
   ```bash
   ss -tlnp | grep -E ':3000|:5173'
   # Kill if found:
   kill <pid>
   ```
2. Commit/stash changes in BandMate repo
3. Tests should pass locally first: `cd backend && npm test`

## Environment Variables

The `docker-compose.yml` in `_Test-BandMate` includes:
- `APP_URL=https://dev-bandmate.bearald.com`
- Google OAuth configured for dev domain
- SQLite database at `/app/data/bandmate.db`

## Troubleshooting

### 502 Bad Gateway
- Container not running or port not bound
- Fix: `docker compose down && docker compose up -d`

### Port Already in Use
```bash
# Find and kill processes
ss -tlnp | grep :3000
kill <pid>
```

### Container Logs
```bash
docker logs bandmate --tail 100
```

## Related
- code-quality.md
- test-coverage.md

📂 Codebase References
- ~/Documents/GitHub/_Test-BandMate/build.sh
- ~/Documents/GitHub/_Test-BandMate/test.sh
- ~/Documents/GitHub/_Test-BandMate/docker-compose.yml
