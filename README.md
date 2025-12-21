# Self-hosted Continuous Deployment Server

This repository contains a **secure, webhook-driven Continuous Deployment (CD) system** designed for my **self-hosted environment**, running on a constrained system — **Android (via Termux)**.

The system listens for verified webhook events, triggers a local deployment script, and safely manages application restarts using PM2.

---

## What this project does

- Listens for **signed webhook events** (via Svix)
- Verifies authenticity before performing any action
- Triggers a **local deployment script** on new pushes
- Builds and restarts a Next.js app safely
- Sends **email notifications** on deploy success or failure
- Avoids exposing SSH/SCP or build logic to CI providers

This follows a **server-driven deployment model**:

> GitHub notifies via GitHub Actions → the server decides and deploys

---

##  Architecture Overview


```
GitHub Push
    ↓
GitHub Actions Notifier
    ↓
Svix (Durable webhook delivery)
    ↓
Webhook Server (index.js)
    ↓
Deploy Script (scripts/deploy-portfolio.sh)
    ↓
PM2 → Next.js App
```


---

## Deployment Flow

1. Code is pushed to `main`
2. GitHub Actions sends a notification event to Svix
3. Svix retries delivery until successful
4. The webhook server:
   - verifies the signature
   - checks event type and branch
   - acknowledges immediately
5. The deployment script runs:
   - pulls the latest code
   - installs dependencies
   - builds the app
   - restarts via PM2
6. An email notification is sent

If the build fails:
- the app is **not restarted**
- the previous version continues running

---

## `index.js` — Webhook Server

Responsibilities:
- Accept raw request bodies
- Verify webhook signatures
- Filter valid deployment events
- Trigger deployment asynchronously
- Send email notifications

---

## `deploy-portfolio.sh` — Deployment Script

Responsibilities:
- Pull the latest code
- Install dependencies
- Build the application
- Restart the app via PM2

Design notes:
- Uses `set -e` to stop on failure
- Keeps downtime minimal

---


## 📌 Why this approach?

Why I choose this approach compared to SSH-based CD or artifact pushing:

| Aspect | This approach |
|------|---------------|
| SSH exposure |  None |
| CI trust level | Minimal |
| Build control | Server-owned |

This mirrors how **self-hosted platforms** handle deployments internally.

---

##  Future Improvements

- Deployment locking (prevent parallel deploys)
- More robust error handling in the deployment script
- Artifact/history management
- Health checks before restart
- Deployment status dashboard
