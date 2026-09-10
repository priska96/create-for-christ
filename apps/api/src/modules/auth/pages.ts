import { API_PATH, AUTH } from '@create-for-christ/contracts';
import type { FastifyInstance } from 'fastify';

const style = `body{font:16px system-ui;background:#f7f5ef;color:#203b30;margin:0;padding:32px}main{max-width:440px;margin:8vh auto;background:#fffdf8;padding:32px;border-radius:24px}h1{font-size:28px}p{line-height:1.6}label{display:block;margin-top:20px}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:8px;border:1px solid #b8c5b7;border-radius:12px;font:inherit}button{background:#36584a;color:white;cursor:pointer}button:disabled{opacity:.6}a{color:#36584a}#message{white-space:pre-line}`;
function page(title: string, content: string) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${title} · Create For Christ</title><style>${style}</style></head><body><main><p>CREATE FOR CHRIST</p>${content}</main></body></html>`;
}
export function registerAuthPages(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply, payload) => {
    if (
      request.url.startsWith('/auth/') ||
      request.url.startsWith('/api/auth/') ||
      request.url.startsWith('/v1/me')
    ) {
      reply.header('Cache-Control', 'no-store');
      reply.header('Referrer-Policy', 'no-referrer');
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header(
        'Content-Security-Policy',
        "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
      );
    }
    return payload;
  });
  app.get(API_PATH.verified, async (request, reply) => {
    const hasError = new URL(request.url, 'http://local').searchParams.has(
      'error'
    );
    return reply
      .type('text/html')
      .send(
        page(
          'E-Mail bestätigen',
          hasError
            ? '<h1>Link nicht mehr gültig.</h1><p>Fordere in der App eine neue Bestätigungs-E-Mail an.</p>'
            : '<h1>E-Mail bestätigt.</h1><p>Wechsle zurück zu Create For Christ und melde dich mit deiner E-Mail-Adresse und deinem Passwort an.</p>'
        )
      );
  });
  app.get(API_PATH.resetPassword, async (_request, reply) =>
    reply.type('text/html').send(
      page(
        'Passwort zurücksetzen',
        `
    <h1>Dein neues Passwort.</h1><p>Wähle mindestens ${AUTH.minPasswordLength} Zeichen. Danach meldest du dich in der App erneut an.</p>
    <form id="reset"><label for="password">Neues Passwort</label><input id="password" type="password" minlength="${AUTH.minPasswordLength}" maxlength="${AUTH.maxPasswordLength}" autocomplete="new-password" required>
    <label for="confirm">Passwort wiederholen</label><input id="confirm" type="password" minlength="${AUTH.minPasswordLength}" maxlength="${AUTH.maxPasswordLength}" autocomplete="new-password" required>
    <button id="submit" type="submit">Passwort speichern</button></form><p id="message" role="status"></p><script src="/auth/reset.js" defer></script>`
      )
    )
  );
  app.get(API_PATH.resetScript, async (_request, reply) =>
    reply.type('application/javascript').send(`
    const form=document.getElementById('reset'),message=document.getElementById('message'),button=document.getElementById('submit');
    const params=new URLSearchParams(location.search),token=params.get('token');
    history.replaceState(null,'',location.pathname);
    if(!token||params.has('error')){form.hidden=true;message.textContent='Dieser Link ist ungültig oder abgelaufen. Fordere in der App einen neuen Link an.';}
    form.addEventListener('submit',async event=>{event.preventDefault();
      const password=document.getElementById('password').value;
      if(password!==document.getElementById('confirm').value){message.textContent='Die Passwörter stimmen nicht überein.';return;}
      button.disabled=true;message.textContent='';
      try{const response=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,newPassword:password})});
        if(!response.ok)throw new Error();form.hidden=true;message.textContent='Passwort gespeichert. Du kannst dich jetzt in der App anmelden.';
      }catch{message.textContent='Das Passwort konnte nicht geändert werden. Prüfe die Verbindung oder fordere einen neuen Link an.';}finally{button.disabled=false;}
    });
  `)
  );
}
