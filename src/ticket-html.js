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

function renderTicketCard(evenement, typeBillet, numero) {
    const nom = escapeHtml(evenement.nom);
    const date = escapeHtml(evenement.date || '');
    const lieu = escapeHtml(evenement.lieu || '');
    const adresse = escapeHtml(evenement.adresse || '');
    const type = escapeHtml(typeBillet);
    const displayNumero = escapeHtml(formatNumero(numero));

    return `<div class="ticket-wrap">
  <div class="ticket">
    <div class="ticket-brand">Marché 241</div>
    <div class="ticket-title">${nom}</div>
    <div class="ticket-meta">
      ${date ? `<div><span>Date</span>${date}</div>` : ''}
      ${lieu ? `<div><span>Lieu</span>${lieu}</div>` : ''}
      ${adresse ? `<div><span>Adresse</span>${adresse}</div>` : ''}
      <div><span>Type</span>${type}</div>
    </div>
    <div class="ticket-number">
      <span>Billet n°</span>
      <strong>${displayNumero}</strong>
    </div>
    <div class="ticket-foot">Présentez ce numéro à l’entrée. Aucun nom n’est associé au billet.</div>
  </div>
</div>`;
}

function renderBilletsHtml({ evenement, billets }) {
    const pages = billets
        .map((billet, index) => {
            const card = renderTicketCard(evenement, billet.type_billet, billet.numero);
            const last = index === billets.length - 1;
            return last ? card : card.replace('class="ticket-wrap"', 'class="ticket-wrap ticket-break"');
        })
        .join('\n');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @page { size: 340px 720px; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  .ticket-wrap {
    width: 340px;
    height: 720px;
    padding: 28px 24px;
    font-family: Arial, Helvetica, sans-serif;
    color: #111827;
  }
  .ticket-break { break-after: page; page-break-after: always; }
  .ticket {
    height: 100%;
    border: 2px solid #508e27;
    border-radius: 20px;
    padding: 28px 22px;
    display: flex;
    flex-direction: column;
    background: #fff;
  }
  .ticket-brand {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #508e27;
    font-weight: bold;
  }
  .ticket-title {
    margin-top: 18px;
    font-size: 26px;
    line-height: 1.2;
    font-weight: bold;
  }
  .ticket-meta {
    margin-top: 28px;
    flex: 1;
  }
  .ticket-meta div {
    margin-bottom: 14px;
    font-size: 16px;
    line-height: 1.35;
  }
  .ticket-meta span {
    display: block;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 4px;
  }
  .ticket-number {
    border-top: 1px dashed #d1d5db;
    padding-top: 22px;
    text-align: center;
  }
  .ticket-number span {
    display: block;
    font-size: 12px;
    color: #6b7280;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .ticket-number strong {
    display: block;
    margin-top: 8px;
    font-size: 52px;
    letter-spacing: 0.08em;
    color: #508e27;
  }
  .ticket-foot {
    margin-top: 18px;
    font-size: 12px;
    line-height: 1.4;
    color: #6b7280;
    text-align: center;
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;
}

module.exports = { renderBilletsHtml, escapeHtml };
