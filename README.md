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

8. Nginx (TLS) en reverse proxy vers `127.0.0.1:3000`. En VPS derrière Nginx, mettre `HOST=127.0.0.1`.
9. Firewall : ouvrir uniquement 443. Optionnel : allowlist IP du serveur Laravel.

## Render (Web Service)

Le service doit écouter `0.0.0.0` et le port fourni par Render (`PORT`). C’est le défaut (`HOST=0.0.0.0`).

Le `postinstall` télécharge Chromium **dans `node_modules`** (`PLAYWRIGHT_BROWSERS_PATH=0`), **sans** `--with-deps` (Render n’a pas le droit root / `su`).

- Env : `API_KEY`, `PLAYWRIGHT_BROWSERS_PATH=0`, `HOST=0.0.0.0`
- Build : `npm ci` (suffit, le postinstall installe Chromium + deps Linux)
- Start : `node src/server.js`

## Variables d’environnement

Voir `.env.example` : `PORT`, `HOST`, `API_KEY`, `MAX_HTML_BYTES` (défaut 20 Mo : les affiches en data URI dépassent souvent 2 Mo), `CONVERT_TIMEOUT_MS`, `CONCURRENCY`.

## Côté Eventime

Configurer Laravel :

```
HTMLTOPDF_URL=https://pdf.votre-domaine/v1/pdf
HTMLTOPDF_API_KEY=<même clé>
```

Le flux billets payants est décrit dans `eventime_repo/docs/features/README_HTMLTOPDF_RELAY.md`.
