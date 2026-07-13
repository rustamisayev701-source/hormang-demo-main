# Hormang Marketplace

## Stack and Runtime Versions

- **Node.js**: v24.11.1
- **pnpm**: v10.32.1
- **TypeScript**: v5.9.2
- **API Framework**: Express 5
- **Frontend Framework**: React 19 + Vite 7
- **Database**: PostgreSQL (Drizzle ORM)

## Development Environment Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Environment Variables**:
   Create a `.env` file in the root:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://user:password@localhost:5432/hormang
   VITE_API_URL=http://localhost:3000/api
   ```
3. **Run API Server**:
   ```bash
   $env:NODE_ENV="development"; $env:PORT=3000; $env:DATABASE_URL="..."; pnpm --filter @workspace/api-server run dev
   ```
4. **Run Landing Page**:
   ```bash
   $env:PORT=5173; $env:BASE_PATH="/"; pnpm --filter @workspace/hormang-landing run dev
   ```

## Successful Start Logs

### API Server
```
> @workspace/api-server@0.0.0 dev C:\Users\Xumoyun\Documents\hormang\Hormang-Marketplace\artifacts\api-server
> tsx ./src/index.ts

Server listening on port 3000
```

### Landing Page
```
  VITE v7.3.1  ready in 1087 ms

  ➜  Local:   http://localhost:5173/
```

## Verification (Health Check)

`GET http://localhost:3000/api/healthz`
```json
{
  "status": "ok"
}
```
