// Email via Resend if configured; otherwise rows wait in the outbox (admin can retry).
// Never logs addresses or bodies (no PII in logs).
export function queueNumberEmail(db, participant, baseUrl) {
  if (!participant.email) return null;
  const link = `${baseUrl}/final?t=${participant.magic_token}`;
  const body = [
    `Hi ${participant.first_name},`, '',
    `Your Creatives Connect Afrika number is ${participant.number}.`,
    'Keep it. On Day 3 you will need your first name and this number, or just tap this link:', link, '',
    'Your answers are used in aggregate. Individual answers are never shown on screen.', '',
    'Gold Coast Games, in partnership with Creatives Connect Afrika',
  ].join('\n');
  const r = db.prepare('INSERT INTO outbox(participant_id,to_email,subject,body) VALUES (?,?,?,?)')
    .run(participant.id, participant.email, `Your CCA number: ${participant.number}`, body);
  return Number(r.lastInsertRowid);
}

export async function sendOutboxRow(db, id, env, fetchImpl = fetch) {
  const row = db.prepare('SELECT * FROM outbox WHERE id = ?').get(id);
  if (!row || row.status === 'sent') return row?.status ?? 'missing';
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return 'unsent';
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [row.to_email], subject: row.subject, text: row.body }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    db.prepare("UPDATE outbox SET status='sent', error=NULL WHERE id=?").run(id);
    return 'sent';
  } catch (e) {
    db.prepare("UPDATE outbox SET status='unsent', error=? WHERE id=?").run(String(e.message).slice(0, 200), id);
    return 'unsent';
  }
}

export async function retryOutbox(db, env, fetchImpl = fetch) {
  const ids = db.prepare("SELECT id FROM outbox WHERE status='unsent' ORDER BY id").all().map((r) => r.id);
  let sent = 0;
  for (const id of ids) if ((await sendOutboxRow(db, id, env, fetchImpl)) === 'sent') sent++;
  return { tried: ids.length, sent };
}
