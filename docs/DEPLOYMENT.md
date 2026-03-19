# Deployment

## Platform: Railway

Railway is a PaaS (Platform-as-a-Service). The boundary between Railway and your application is clean: **Railway handles everything below the OS; you own everything above it.**

### What Railway Manages

| Layer | Railway |
|-------|---------|
| Physical hardware | ✅ |
| Network / DDoS protection | ✅ |
| OS / kernel | ✅ |
| Container runtime | ✅ |
| TLS certificates (HTTPS) | ✅ (automatic, via Let's Encrypt) |
| DNS for Railway subdomains | ✅ |
| Postgres installation & process | ✅ |
| Postgres backups | ✅ (daily, built-in) |
| Horizontal/vertical scaling | ✅ (config-driven) |
| Zero-downtime deploys | ✅ |
| Secrets management (env vars) | ✅ |

### What You Own

| Layer | You |
|-------|-----|
| Application code | ✅ |
| Dockerfile / build config | ✅ |
| Database schema & migrations | ✅ |
| Environment variables (values) | ✅ |
| Custom domain DNS records | ✅ |
| Application-level security | ✅ |
| OTel instrumentation | ✅ |
| Backup restore procedures | ✅ |

### How Deploys Work

Railway connects to your GitHub repo. On every push to `main`:

1. Railway pulls the latest commit
2. Runs your build command (`npm run build`)
3. Starts the new container
4. Health check passes → traffic switches over
5. Old container is stopped

Zero-downtime by default. One-click rollback to any previous deploy in the dashboard.

### Services in This Project

```
Railway Project: job-tracker
├── job-tracker-api     (Node.js service — your Express app)
│   └── Linked to GitHub: kgheacock/job-tracker
│   └── Root dir: /server
│   └── Build: npm install && npm run build
│   └── Start: node dist/index.js
│
└── job-tracker-db      (Postgres service — managed by Railway)
    └── DATABASE_URL injected automatically into job-tracker-api
```

Railway injects `DATABASE_URL` from the Postgres service into your API service automatically — no manual copy-paste of connection strings.

The React frontend is built as a static bundle (`npm run build` in `/client`) and served by the Express API from a `public/` directory, or deployed separately to a static host (Netlify, Vercel, or Railway's static service). Serving it from Express keeps the project to one Railway service and avoids CORS complexity.

---

## Cost Estimate

Railway's Hobby plan ($5/month minimum) is the right tier for this project. Here's the breakdown:

### Pricing Units (Hobby)

| Resource | Rate |
|----------|------|
| CPU | $0.00000772 / vCPU-second |
| Memory | $0.00000386 / GB-second |
| Volume (Postgres data) | $0.00000006 / GB-second |
| Egress | $0.05 / GB |

### Assumptions

This is a portfolio/personal project. Usage will be light — occasional demo sessions for interviews, maybe daily personal use.

| Estimate | Value |
|----------|-------|
| CPU allocation | 0.1 vCPU average (Express is mostly idle) |
| Memory allocation | 256 MB average |
| Postgres data size | ~100 MB |
| Egress | ~1 GB/month |
| Uptime | 24/7 (always-on, no sleep) |

### Monthly Math

**API service (Node.js):**
- CPU: 0.1 vCPU × 2,592,000 sec/month × $0.00000772 = **~$2.00**
- Memory: 0.25 GB × 2,592,000 sec/month × $0.00000386 = **~$2.50**

**Postgres service:**
- CPU: ~0.05 vCPU × 2,592,000 × $0.00000772 = **~$1.00**
- Memory: 0.1 GB × 2,592,000 × $0.00000386 = **~$0.40**
- Volume: 0.1 GB × 2,592,000 × $0.00000006 = **~$0.02**

**Egress:**
- 1 GB × $0.05 = **$0.05**

**Total estimated: ~$6/month**

The $5 Hobby credit covers most of it. Real cost is likely **$1–3/month out of pocket** on top of the $5 minimum — closer to $0 out of pocket if usage is light enough to stay within the credit.

### Cost Guardrails

- Set a **hard limit** in Railway dashboard (e.g. $15/month) to prevent runaway spend
- Railway will stop services if the limit is hit rather than surprise-bill you
- AI cover letter feature: ~$0.02/call with Claude Haiku — add $1–2/month if you use it regularly

### Scaling Up (If Needed)

If this ever gets real traffic (unlikely for a portfolio project but worth knowing):

| Scenario | Estimated Cost |
|----------|---------------|
| Current (personal use) | ~$6/month |
| 100 daily active users | ~$15–25/month |
| 1,000 DAU | ~$80–150/month |
| At $150/month, consider migrating to | a VPS (Hetzner/DigitalOcean) + managed Postgres |

For a portfolio project, Railway Hobby is the right call. Easy to set up, zero ops overhead, and the bill won't surprise you.

---

## Custom Domain: jobs.keithheacock.com

The app will be accessible at `https://jobs.keithheacock.com`. This routes through the existing VPS running nginx, which reverse-proxies to Railway.

**Why subdomain over path (`keithheacock.com/jobs`):**
- No changes needed to the React app (no `basename` config, no router adjustments)
- Cleaner nginx config — one server block, not a `location` block grafted onto an existing site
- Reads better on a resume: `jobs.keithheacock.com` is a real URL

### Architecture

```
Browser → jobs.keithheacock.com
  → DNS (CNAME → VPS IP)
    → nginx on VPS (TLS termination, proxy_pass)
      → Railway (job-tracker-api service)
        → Express app
```

Railway also issues its own `*.up.railway.app` URL. Nginx proxies to that — Railway handles the actual compute; your VPS is just the front door.

### Step 1 — DNS

Add a CNAME record at your DNS provider:

```
Type:  CNAME
Name:  jobs
Value: <your-railway-app>.up.railway.app
TTL:   3600
```

Or if you prefer to point at the VPS IP directly (so nginx is the only entry point):

```
Type:  A
Name:  jobs
Value: <your VPS IP>   # 204.168.165.58
TTL:   3600
```

Using the A record pointing to your VPS is recommended — it gives you full control at nginx and Railway's URL becomes an implementation detail.

### Step 2 — nginx Config

Add a new server block to your nginx config (e.g. `/etc/nginx/sites-available/jobs.keithheacock.com`):

```nginx
server {
    listen 80;
    server_name jobs.keithheacock.com;
    # Redirect HTTP → HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name jobs.keithheacock.com;

    # TLS — managed by Certbot (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/jobs.keithheacock.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jobs.keithheacock.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass         https://<your-railway-app>.up.railway.app;
        proxy_http_version 1.1;

        # Forward original host and IP so Express/logs see the real request
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # WebSocket support (not needed now, cheap to include)
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
```

### Step 3 — TLS Certificate

```bash
# On the VPS, issue a cert for the new subdomain
sudo certbot --nginx -d jobs.keithheacock.com
```

Certbot will auto-update the nginx config with the cert paths and set up auto-renewal.

### Step 4 — Enable and Reload

```bash
sudo ln -s /etc/nginx/sites-available/jobs.keithheacock.com \
           /etc/nginx/sites-enabled/

sudo nginx -t          # verify config is valid
sudo systemctl reload nginx
```

### Step 5 — Tell Express It's Behind a Proxy

Add this near the top of your Express app so `req.ip` and `req.protocol` are correct (important for rate limiting and OTel span attributes):

```js
app.set('trust proxy', 1);
```

### Step 6 — Update CORS

In your Express config, add `https://jobs.keithheacock.com` to the allowed origins:

```js
cors({
  origin: [
    'http://localhost:5173',                    // dev
    'https://jobs.keithheacock.com',            // prod
  ]
})
```

### Railway Side

In the Railway dashboard, under your API service → Settings → Networking:
- You can optionally add `jobs.keithheacock.com` as a custom domain there too, but it's not required if nginx is proxying to the `*.up.railway.app` URL. Either approach works.
- The `*.up.railway.app` URL will remain active — you may want to restrict direct access to it so all traffic flows through your nginx/VPS. Railway doesn't have IP allowlisting on Hobby, so the simplest approach is to add a secret header check in nginx and validate it in Express middleware, but that's optional hardening for a portfolio project.
