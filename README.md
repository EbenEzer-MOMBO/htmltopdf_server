# htmltopdf_server

Mini relais **HTML → PDF** pour Eventime. Il tourne sur un **VPS séparé** (Node + Chromium Playwright), car le serveur Laravel n’a pas les droits root pour installer Chromium.

Laravel envoie le HTML déjà rendu (billet) ; ce service renvoie un PDF binaire.

## API

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | `/health` | non | Processus + Chromium |
| POST | `/v1/pdf` | `X-Api-Key` | Conversion |

**Body JSON**

```json
{
  "html": "<!DOCTYPE html>...",
  "options": {
    "width": "340px",
    "height": "720px",
    "printBackground": true
  }
}
```

Réponse : `application/pdf`.

Pas d’URL distante en entrée (évite le SSRF) : uniquement du HTML.

## Installation VPS (sans Docker)

1. Node 20+ (`node -v`).
2. Copier le projet, par ex. `/opt/htmltopdf_server`.
3. `cp .env.example .env` puis définir un `API_KEY` long et aléatoire.
4. `npm ci`
5. `npx playwright install chromium`  
   Si vous avez root : `npx playwright install-deps chromium` pour les libs système.
6. Tester : `npm start` puis `curl http://127.0.0.1:3000/health`
7. systemd : copier `deploy/htmltopdf.service` vers `/etc/systemd/system/`, adapter `User` / `WorkingDirectory`, puis :

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now htmltopdf
```

8. Nginx (TLS) en reverse proxy vers `127.0.0.1:3000`. Le service n’écoute que en local.
9. Firewall : ouvrir uniquement 443. Optionnel : allowlist IP du serveur Laravel.

## Variables d’environnement

Voir `.env.example` : `PORT`, `API_KEY`, `MAX_HTML_BYTES`, `CONVERT_TIMEOUT_MS`, `CONCURRENCY`.

## Côté Eventime

Configurer Laravel :

```
HTMLTOPDF_URL=https://pdf.votre-domaine/v1/pdf
HTMLTOPDF_API_KEY=<même clé>
```

Le flux billets payants est décrit dans `eventime_repo/docs/features/README_HTMLTOPDF_RELAY.md`.
