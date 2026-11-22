/* ==========================================================================
   LA CHAPELLE OCCULTE — assistant de réservation (100 % statique)
   Aucun serveur, aucun abonnement : le formulaire compose une demande de
   rendez-vous prête à envoyer par message (Instagram, Messenger, et SMS /
   e-mail dès qu'un numéro ou une adresse est renseigné dans js/config.js),
   avec en bonus un fichier agenda .ics (événement « à confirmer »).
   ========================================================================== */
(() => {
  'use strict';
  const CFG = window.CHAPELLE || {};
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const form = $('#wizard');
  if (!form) return;

  const panels = $$('.wiz__panel[data-step]', form);
  const stepLis = $$('.wiz__steps li', form);
  const btnPrev = $('#wizPrev'), btnNext = $('#wizNext'), errBox = $('#wizError');
  const toast = $('#toast');
  const LAST = 4;
  let step = 1;
  const picked = []; // { iso, slot }
  const MAX_DAYS = 3;

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                         */
  /* ------------------------------------------------------------------ */
  const val = (name) => (form.elements[name] ? String(form.elements[name].value || '').trim() : '');
  const checked = (name) => $$('input[name="' + name + '"]:checked', form).map((i) => i.value);
  const radio = (name) => { const r = $('input[name="' + name + '"]:checked', form); return r ? r.value : ''; };
  const pad = (n) => String(n).padStart(2, '0');
  const isoOf = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
  const parseIso = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const openHours = (dow) => (CFG.horaires || {})[dow] || null;
  const showError = (msg, el) => {
    errBox.textContent = msg; errBox.hidden = false;
    if (el) { const f = el.closest('.field, .switch'); if (f) f.classList.add('is-bad'); el.focus({ preventScroll: false }); }
  };
  const clearError = () => { errBox.hidden = true; errBox.textContent = ''; $$('.is-bad', form).forEach((e) => e.classList.remove('is-bad')); };
  const say = (msg) => { toast.textContent = msg; };

  /* ------------------------------------------------------------------ */
  /* Calendrier                                                          */
  /* ------------------------------------------------------------------ */
  const cal = $('#cal');
  const calGrid = $('.cal__grid', cal), calMonth = $('.cal__month', cal);
  const btnCalPrev = $('[data-cal="prev"]', cal), btnCalNext = $('[data-cal="next"]', cal);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = new Date(today); minDate.setDate(minDate.getDate() + 1);
  const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + (CFG.joursReservablesMax || 120));
  let view = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

  function renderCal() {
    calMonth.textContent = fmtMonth.format(view);
    calGrid.textContent = '';
    const y = view.getFullYear(), m = view.getMonth();
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // lundi = 0
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < offset; i++) { const v = document.createElement('span'); v.className = 'cal__day--void'; calGrid.appendChild(v); }
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const iso = isoOf(y, m, d);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cal__day'; b.textContent = d; b.dataset.iso = iso;
      const ok = date >= minDate && date <= maxDate && openHours(date.getDay());
      b.disabled = !ok;
      if (+date === +today) b.classList.add('is-today');
      const sel = picked.some((p) => p.iso === iso);
      if (sel) b.classList.add('is-sel');
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      b.setAttribute('aria-label', fmtDay.format(date) + (ok ? '' : ' — indisponible'));
      calGrid.appendChild(b);
    }
    btnCalPrev.disabled = new Date(y, m, 1) <= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    btnCalNext.disabled = new Date(y, m + 1, 1) > maxDate;
  }
  btnCalPrev.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  btnCalNext.addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });

  const SLOTS = {
    sat: [['journée', 'Toute la journée (10h30 – 18h)'], ['matin', 'Plutôt le matin (10h30 – 13h)'], ['après-midi', 'Plutôt l’après-midi (13h – 18h)']],
    week: [['peu importe', 'Peu importe (13h30 – 18h)'], ['début d’après-midi', 'Début d’après-midi (13h30 – 15h30)'], ['fin d’après-midi', 'Fin d’après-midi (15h30 – 18h)']]
  };
  function renderPicked() {
    const list = $('.picked__list', form), empty = $('.picked__empty', form);
    list.textContent = '';
    empty.hidden = picked.length > 0;
    picked.sort((a, b) => a.iso.localeCompare(b.iso)).forEach((p) => {
      const date = parseIso(p.iso);
      const li = document.createElement('li');
      const b = document.createElement('b'); b.textContent = fmtDay.format(date);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Créneau souhaité pour le ' + fmtDay.format(date));
      (date.getDay() === 6 ? SLOTS.sat : SLOTS.week).forEach(([v, t]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = t; if (v === p.slot) o.selected = true; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { p.slot = sel.value; });
      const rm = document.createElement('button');
      rm.type = 'button'; rm.setAttribute('aria-label', 'Retirer le ' + fmtDay.format(date));
      rm.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-close"/></svg>';
      rm.addEventListener('click', () => { picked.splice(picked.indexOf(p), 1); renderPicked(); renderCal(); });
      li.append(b, sel, rm); list.appendChild(li);
    });
  }
  calGrid.addEventListener('click', (e) => {
    const b = e.target.closest('.cal__day'); if (!b || b.disabled) return;
    clearError();
    const i = picked.findIndex((p) => p.iso === b.dataset.iso);
    if (i >= 0) picked.splice(i, 1);
    else if (picked.length >= MAX_DAYS) { showError('Tu peux proposer 3 jours au maximum — retires-en un pour en changer.'); return; }
    else picked.push({ iso: b.dataset.iso, slot: parseIso(b.dataset.iso).getDay() === 6 ? 'journée' : 'peu importe' });
    renderPicked(); renderCal();
    const again = $('.cal__day[data-iso="' + b.dataset.iso + '"]', calGrid); if (again) again.focus();
  });

  /* ------------------------------------------------------------------ */
  /* Étapes                                                              */
  /* ------------------------------------------------------------------ */
  function show(n) {
    step = n;
    panels.forEach((p) => {
      const on = +p.dataset.step === n;
      p.classList.toggle('is-on', on);
      if (+p.dataset.step === 5) p.hidden = !on;
    });
    stepLis.forEach((li, i) => { li.classList.toggle('is-on', i + 1 === n); li.classList.toggle('is-done', i + 1 < n || n === 5); });
    form.classList.toggle('is-sent', n === 5);
    btnPrev.hidden = n === 1 || n === 5;
    $('.btn__label', btnNext).firstChild.textContent = n === LAST ? 'Voir ma demande ' : 'Continuer ';
    clearError();
    const panel = panels.find((p) => +p.dataset.step === n);
    const focusEl = panel && ($('legend', panel) || $('h3', panel));
    if (focusEl) { focusEl.setAttribute('tabindex', '-1'); focusEl.focus({ preventScroll: true }); }
    const r = form.getBoundingClientRect();
    if (r.top < 90) {
      const target = form.getBoundingClientRect().top + scrollY - 100;
      if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1 });
      else scrollTo({ top: target, behavior: 'smooth' });
    }
  }

  function validate(n) {
    clearError();
    if (n === 2) {
      const idea = form.elements.idee;
      if (val('idee').length < 10) { showError('Décris ton idée en quelques mots (10 caractères minimum) : les artistes en ont besoin pour te répondre.', idea); return false; }
    }
    if (n === 3) {
      if (!picked.length && !form.elements.flexible.checked) { showError('Choisis au moins un jour dans le calendrier, ou coche « Je suis flexible sur les dates ».'); return false; }
    }
    if (n === 4) {
      if (!val('prenom')) { showError('Indique ton prénom.', form.elements.prenom); return false; }
      const tel = val('tel'), insta = val('insta'), mail = val('mail');
      if (!tel && !insta && !mail) { showError('Ajoute au moins un moyen de te recontacter : téléphone, Instagram ou e-mail.', form.elements.tel); return false; }
      if (tel && tel.replace(/\D/g, '').length < 9) { showError('Ce numéro de téléphone semble incomplet.', form.elements.tel); return false; }
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) { showError('Cette adresse e-mail semble invalide.', form.elements.mail); return false; }
      if (!form.elements.consent.checked) { showError('Coche la case d’accord pour continuer.', form.elements.consent); return false; }
    }
    return true;
  }

  btnNext.addEventListener('click', () => {
    if (!validate(step)) return;
    if (step < LAST) show(step + 1);
    else { buildRecap(); show(5); copyText(buildMessage(), true); }
  });
  btnPrev.addEventListener('click', () => step > 1 && show(step - 1));
  $('#wizReset').addEventListener('click', () => { say(''); show(1); });
  form.addEventListener('submit', (e) => e.preventDefault());
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); btnNext.click(); } });

  /* ------------------------------------------------------------------ */
  /* Message                                                             */
  /* ------------------------------------------------------------------ */
  function buildMessage() {
    const styles = checked('styles'), zones = checked('zone');
    const insta = val('insta') ? '@' + val('insta').replace(/^@+/, '') : '';
    const lines = [];
    lines.push('Bonjour La Chapelle Occulte,');
    lines.push('Je souhaite prendre rendez-vous (demande préparée depuis votre site).');
    lines.push('');
    lines.push('• Artiste : ' + radio('artiste'));
    lines.push('• Projet : ' + radio('type') + (styles.length ? ' — ' + styles.join(', ') : ''));
    if (zones.length) lines.push('• Zone : ' + zones.join(', '));
    lines.push('• Taille : ' + radio('taille'));
    lines.push('• Mon idée : ' + val('idee').replace(/\s*\n\s*/g, ' '));
    lines.push('• Premier tatouage : ' + (form.elements.premier.checked ? 'oui' : 'non'));
    if (picked.length) {
      lines.push('• Jours souhaités :');
      picked.slice().sort((a, b) => a.iso.localeCompare(b.iso)).forEach((p) => lines.push('   – ' + fmtDay.format(parseIso(p.iso)) + ' (' + p.slot + ')'));
    }
    if (form.elements.flexible.checked) lines.push('• Je suis flexible sur les dates.');
    lines.push('• Prénom : ' + [val('prenom'), val('nom')].filter(Boolean).join(' '));
    const contact = [val('tel') && 'tél. ' + val('tel'), insta && 'Instagram ' + insta, val('mail') && 'e-mail ' + val('mail')].filter(Boolean);
    lines.push('• Pour me joindre : ' + contact.join(' · '));
    lines.push('• Âge : ' + radio('age'));
    lines.push('');
    lines.push('Je vous envoie mes images de référence dans cette conversation. Merci beaucoup !');
    return lines.join('\n');
  }

  async function copyText(text, silent) {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-999px;top:0';
        document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); if (!ok) throw new Error('copy');
      }
      say(silent ? 'Message copié dans ton presse-papiers.' : 'Message copié — il ne reste qu’à le coller dans la conversation.');
      return true;
    } catch (e) {
      say(silent ? '' : 'Impossible de copier automatiquement : sélectionne le message ci-dessus et copie-le.');
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Récapitulatif + canaux d'envoi                                       */
  /* ------------------------------------------------------------------ */
  function buildRecap() {
    const msg = buildMessage();
    $('#msgPreview').textContent = msg;
    const enc = encodeURIComponent(msg);
    $('#sendIg').href = 'https://ig.me/m/' + encodeURIComponent(CFG.instagram || 'lachapelleocculte.tattoo');
    $('#sendMs').href = 'https://m.me/' + encodeURIComponent(CFG.messenger || 'Lachapelleoccultetattoo');
    const phone = (CFG.phone || '').replace(/\s+/g, '');
    if (phone) $('#sendSms').href = 'sms:' + phone + '?&body=' + enc;
    if (CFG.email) $('#sendMail').href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Demande de rendez-vous — ' + val('prenom')) + '&body=' + enc;
    $('#sendIcs').disabled = !picked.length;
  }
  ['#sendIg', '#sendMs'].forEach((id) => $(id).addEventListener('click', () => copyText(buildMessage(), false)));
  $('#sendCopy').addEventListener('click', () => copyText(buildMessage(), false));
  $('#sendSms').addEventListener('click', () => copyText(buildMessage(), true));

  /* ------------------------------------------------------------------ */
  /* Fichier agenda (.ics) — événements « à confirmer »                    */
  /* ------------------------------------------------------------------ */
  const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line) => { const out = []; let l = line; while (l.length > 73) { out.push(l.slice(0, 73)); l = ' ' + l.slice(73); } out.push(l); return out.join('\r\n'); };
  function startFor(date, slot) {
    const sat = date.getDay() === 6;
    if (sat) return slot === 'après-midi' ? [14, 0] : [10, 30];
    return slot === 'fin d’après-midi' ? [15, 30] : [13, 30];
  }
  function buildIcs() {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const msg = buildMessage();
    const ev = picked.slice().sort((a, b) => a.iso.localeCompare(b.iso)).map((p, i) => {
      const d = parseIso(p.iso); const [h, mi] = startFor(d, p.slot);
      const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
      const e = new Date(s.getTime() + 2 * 3600 * 1000);
      const f = (x) => x.getFullYear() + pad(x.getMonth() + 1) + pad(x.getDate()) + 'T' + pad(x.getHours()) + pad(x.getMinutes()) + '00';
      return [
        'BEGIN:VEVENT', 'UID:' + Date.now() + '-' + i + '@chapelle-occulte', 'DTSTAMP:' + stamp, 'DTSTART:' + f(s), 'DTEND:' + f(e),
        'SUMMARY:' + icsEsc('RDV tatouage — La Chapelle Occulte (à confirmer' + (picked.length > 1 ? ', option ' + (i + 1) : '') + ')'),
        'LOCATION:' + icsEsc(CFG.adresse || '97 rue du Chêne Brûlé, 54700 Lesménils'),
        'DESCRIPTION:' + icsEsc('Créneau souhaité, pas encore confirmé par l’atelier.\n\n' + msg),
        'STATUS:TENTATIVE', 'TRANSP:TRANSPARENT', 'END:VEVENT'
      ].map(fold).join('\r\n');
    });
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//La Chapelle Occulte//Demande de RDV//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...ev, 'END:VCALENDAR'].join('\r\n');
  }
  $('#sendIcs').addEventListener('click', () => {
    if (!picked.length) { say('Choisis d’abord au moins un jour dans le calendrier.'); return; }
    const blob = new Blob([buildIcs()], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'rdv-la-chapelle-occulte.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    say('Fichier agenda téléchargé : les créneaux sont marqués « à confirmer ».');
  });

  /* ------------------------------------------------------------------ */
  renderCal(); renderPicked(); show(1);
})();
