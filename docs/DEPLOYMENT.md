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
