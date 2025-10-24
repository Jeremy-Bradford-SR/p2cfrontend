P2C Frontend

A small React + Vite frontend and a proxy service. The proxy (Express) runs on port 9000 and forwards safe requests to your P2C API. It also performs Nominatim geocoding with a local cache to avoid rate limits.

Run locally:

```bash
npm install
npm run dev
```

Build and run with Docker (frontend + proxy):

The proxy needs to know the address of your P2C API. You must set the `P2C_API_BASE` environment variable.

If the API is running on your host machine, you can use the special DNS name `host.docker.internal`.

Create a `.env` file in this directory with the following content:
```
P2C_API_BASE=http://host.docker.internal:8083/api/data
```

Then, run Docker Compose:
```bash
docker compose up --build
```

This will build the frontend image and the proxy image and expose:
- Frontend: http://localhost:8004
- Proxy: http://localhost:9000

Notes:
- The app requests data directly from your API. Ensure CORS is enabled on that server or run a reverse proxy.
- DailyBulletinArrests rows without explicit coordinates will be geocoded by the proxy using Nominatim. Results are cached in-memory for 24 hours. Be mindful of Nominatim's usage policy.
- The client enforces the safe rules you provided: it fetches `/tables`, `/schema`, and sends SELECT queries via `/query` only.
