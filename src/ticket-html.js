const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'Logo_vector_text-02.png');

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
        switch (char) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            default:
                return '&#39;';
        }
    });
}

function formatNumero(numero) {
    const n = Number(numero);
    if (!Number.isFinite(n) || n < 1) {
        return String(numero);
    }
    return String(Math.trunc(n)).padStart(4, '0');
}

function qrPayload(jeton, numero) {
    return `M241|${jeton}|${numero}`;
}

function logoDataUri() {
    const buf = fs.readFileSync(LOGO_PATH);
    return `data:image/png;base64,${buf.toString('base64')}`;
}

function fileToDataUri(filePath) {
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : ext === '.svg' ? 'image/svg+xml' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
}

function safeImageSrc(src) {
    if (typeof src !== 'string') {
        return '';
    }
    const trimmed = src.trim();
    if (
        trimmed.startsWith('data:image/') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('http://')
    ) {
        return trimmed;
    }
    return '';
}

function lieuLine(evenement) {
    return [evenement.lieu, evenement.adresse].filter(Boolean).join(', ');
}

async function renderQrPng(payload) {
    return QRCode.toDataURL(payload, {
        margin: 0,
        width: 224,
        color: { dark: '#111827', light: '#ffffff' },
    });
}

async function renderTicketCard(evenement, typeBillet, numero, jeton, logoSrc, participantNom) {
    const nom = escapeHtml(evenement.nom);
    // Billet nominatif : nom du titulaire, avec retour à la ligne forcé pour les noms longs sans espace
    const ligneTitulaire = participantNom
        ? `<span style="font-size:13px;font-weight:600;color:#111827;overflow-wrap:anywhere">${escapeHtml(participantNom)}</span>`
        : '';
    const mentionBillet = participantNom
        ? "Billet nominatif. Scannez à l'entrée."
        : "Scannez à l'entrée. Billet au porteur, aucun nom associé.";
    const date = escapeHtml(evenement.date || '');
    const lieu = escapeHtml(lieuLine(evenement));
    const type = escapeHtml(typeBillet);
    const displayNumero = escapeHtml(formatNumero(numero));
    const image = safeImageSrc(evenement.image);
    const qr = await renderQrPng(qrPayload(jeton, numero));
    const poster = image
        ? `<img src="${escapeHtml(image)}" alt="" style="position:absolute;left:0;top:0;width:100%;height:400px;object-fit:cover;object-position:50% 30%;display:block">`
        : '';

    return `<div class="ticket-wrap">
      <div style="position:relative;width:340px;height:640px;border-radius:0;overflow:hidden;background:#07111c;display:flex;flex-direction:column">
        ${poster}
        <div style="position:absolute;left:0;top:0;width:100%;height:400px;background:linear-gradient(180deg,rgba(7,17,28,.35) 0%,rgba(7,17,28,0) 30%,rgba(7,17,28,.6) 70%,#07111c 100%)"></div>

        <div style="position:relative;padding:18px 18px 0;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;padding:5px 10px 5px 8px;border-radius:99px;background:#fff">
            <img src="${logoSrc}" alt="Marché241" style="height:22px;width:auto;object-fit:contain;display:block">
          </div>
          <span style="font-size:12px;font-weight:600;color:#fff;padding:5px 11px;border-radius:99px;border:1px solid rgba(255,255,255,.4);background:rgba(0,0,0,.25)">${type}</span>
        </div>

        <div style="position:relative;margin-top:auto;padding:0 22px 20px;display:flex;flex-direction:column;gap:14px">
          <span style="font-size:32px;font-weight:800;letter-spacing:-.025em;line-height:1.05;color:#fff">${nom}</span>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${date ? `<span style="font-size:16px;font-weight:600;color:#fff">${date}</span>` : ''}
            ${lieu ? `<span style="font-size:14px;color:#c7d2dc">${lieu}</span>` : ''}
          </div>
        </div>

        <div style="position:relative;margin:0 14px 14px;padding:16px;border-radius:16px;background:#fff;display:flex;align-items:center;gap:16px">
          <img src="${qr}" alt="QR code" style="width:112px;height:112px;flex:none;display:block;image-rendering:pixelated">
          <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
            <span style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Billet n°</span>
            <span style="font-family:'Geist Mono',ui-monospace,monospace;font-size:34px;font-weight:600;line-height:1;background:linear-gradient(90deg,#508e27,#74adaf);-webkit-background-clip:text;background-clip:text;color:transparent">${displayNumero}</span>
            ${ligneTitulaire}
            <span style="font-size:11px;line-height:1.45;color:#6b7280">${mentionBillet}</span>
          </div>
        </div>
      </div>
    </div>`;
}

async function renderBilletsHtml({ evenement, billets, jeton }) {
    const logoSrc = logoDataUri();
    const pages = [];
    for (let index = 0; index < billets.length; index += 1) {
        const billet = billets[index];
        const card = await renderTicketCard(
            evenement,
            billet.type_billet,
            billet.numero,
            jeton || '',
            logoSrc,
            billet.participant_nom || '',
        );
        const last = index === billets.length - 1;
        pages.push(
            last ? card : card.replace('class="ticket-wrap"', 'class="ticket-wrap ticket-break"'),
        );
    }

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @page { size: 340px 640px; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #07111c;
    font-family: 'Geist','Helvetica Neue',Helvetica,Arial,sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .ticket-wrap {
    width: 340px;
    height: 640px;
    margin: 0;
    padding: 0;
  }
  .ticket-break { break-after: page; page-break-after: always; }
</style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}

module.exports = { renderBilletsHtml, escapeHtml, fileToDataUri };
