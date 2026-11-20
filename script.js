'use strict';

/* ══════════════════════════════════════════════════════════════
   1. ABSTRACT ACCORDION (Seminars pages)
══════════════════════════════════════════════════════════════ */
document.querySelectorAll('.abstract-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const isOpen = btn.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    const body = btn.nextElementSibling;
    if (body) {
      body.classList.toggle('open', isOpen);
      if (isOpen && window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([body]).catch(err => console.warn('MathJax:', err));
      }
    }
  });
});

/* ══════════════════════════════════════════════════════════════
   2. MAILING LIST FORM (Contact page)
══════════════════════════════════════════════════════════════ */
const form    = document.getElementById('mailing-form');
const success = document.getElementById('subscribe-success');

if (form && success) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const emailInput = document.getElementById('email-input');
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email || !email.includes('@')) return;

    const endpoint = (form.getAttribute('action') || '').trim();
    const isConfiguredEndpoint =
      endpoint &&
      !endpoint.includes('ACTION_URL_DA_INSERIRE_QUI') &&
      !endpoint.includes('YOUR_FORM_ID') &&
      !endpoint.endsWith('/xyzabcde');

    if (isConfiguredEndpoint) {
      const isNoCorsEndpoint =
        endpoint.includes('script.google.com/macros/') ||
        endpoint.includes('docs.google.com/forms');
      try {
        if (isNoCorsEndpoint) {
          await fetch(endpoint, {
            method: 'POST',
            mode: 'no-cors',
            body: new FormData(form)
          });
          form.style.display = 'none';
          success.classList.add('show');
          return;
        } else {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Accept': 'application/json' },
            body: new FormData(form)
          });
          if (res.ok) {
            form.style.display = 'none';
            success.classList.add('show');
            return;
          }
        }
      } catch (err) {
        console.warn('Form service unreachable, falling back to mailto:', err);
      }
    }

    /* ── mailto: fallback ──
       Opens the user's email client with a pre-filled subscription
       request addressed to doctorv.uniroma2@gmail.com. */
    const subject = encodeURIComponent('Mailing list subscription request — DocTorV Seminars');
    const body    = encodeURIComponent(
      `Hi,\n\nI would like to subscribe to the DocTorV Seminars mailing list.\n\nMy email address: ${email}\n\nThank you!`
    );
    window.location.href = `mailto:doctorv.uniroma2@gmail.com?subject=${subject}&body=${body}`;
    form.style.display = 'none';
    success.classList.add('show');
  });
}

/* ══════════════════════════════════════════════════════════════
   3. LANGUAGE TOGGLE (IT / EN) WITH LOCALSTORAGE PERSISTENCE
══════════════════════════════════════════════════════════════ */
const langToggle  = document.getElementById('lang-toggle');
const htmlEl      = document.documentElement;
const STORAGE_KEY = 'doctorv_lang';

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'it' || saved === 'en') {
      return saved;
    }
  } catch (err) {
    // Fallback if localStorage is restricted in sandboxed iframe
  }
  return 'en';
}

function saveLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (err) {
    // Ignore storage write errors in restricted iframe contexts
  }
}

/**
 * Walk every element with data-en / data-it attributes
 * and swap the content to the requested language without reloading.
 * Also handles data-en-placeholder / data-it-placeholder on inputs.
 */
function applyLanguage(lang) {
  htmlEl.setAttribute('lang', lang);
  htmlEl.setAttribute('data-lang', lang);

  /* Swap innerHTML for elements carrying data-en / data-it */
  document.querySelectorAll('[data-en], [data-it]').forEach(el => {
    const val = el.getAttribute('data-' + lang);
    if (val !== null) {
      el.innerHTML = val;
    }
  });

  /* Swap placeholder for inputs */
  document.querySelectorAll('[data-en-placeholder]').forEach(inp => {
    const val = inp.getAttribute('data-' + lang + '-placeholder');
    if (val) inp.placeholder = val;
  });

  /* Update toggle ARIA label */
  if (langToggle) {
    langToggle.setAttribute('aria-label',
      lang === 'en' ? 'Switch to Italian' : 'Passa all\'inglese'
    );
  }

  /* Update close button ARIA label on organiser modal if present */
  const modalCloseBtn = document.getElementById('org-modal-close');
  if (modalCloseBtn) {
    modalCloseBtn.setAttribute('aria-label', lang === 'it' ? 'Chiudi' : 'Close');
  }

  /* Update active-lang class on flag labels */
  document.querySelectorAll('.flag-label').forEach(fl => {
    const isIt = fl.classList.contains('flag-it');
    const isEn = fl.classList.contains('flag-en');
    fl.classList.toggle('active-lang', (lang === 'it' && isIt) || (lang === 'en' && isEn));
  });

  /* Re-typeset MathJax after language change */
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise().catch(err => console.warn('MathJax:', err));
  }
}

if (langToggle) {
  /* Toggle handler:
     Checkbox UNCHECKED → EN (default);  CHECKED → IT */
  langToggle.addEventListener('change', () => {
    const selectedLang = langToggle.checked ? 'it' : 'en';
    saveLanguage(selectedLang);
    applyLanguage(selectedLang);
  });
}

/* Synchronize language across tabs/iframes on the same GitHub Pages origin */
window.addEventListener('storage', e => {
  if (e.key === STORAGE_KEY && (e.newValue === 'it' || e.newValue === 'en')) {
    if (langToggle) {
      langToggle.checked = (e.newValue === 'it');
    }
    applyLanguage(e.newValue);
  }
});

/* Initialize language from localStorage (defaults to English) */
(function initLanguage() {
  const initialLang = getSavedLanguage();
  if (langToggle) {
    langToggle.checked = (initialLang === 'it');
  }
  applyLanguage(initialLang);
})();

/* ══════════════════════════════════════════════════════════════
   4. ORGANISER CONTACT MODAL (POP-UP — IT & EN, Homepage)
══════════════════════════════════════════════════════════════ */
const orgModal      = document.getElementById('org-modal');
const orgModalText  = document.getElementById('org-modal-text');
const orgModalClose = document.getElementById('org-modal-close');

const organiserContacts = {
  'Alessia Guido':      { email: 'a.guido@ifac.cnr.it',            mailto: 'mailto:alessia.guido@ifac.cnr.it' },
  'Arianna Vicari':     { email: 'vicari@axp.mat.uniroma2.it',     mailto: 'mailto:vicari@axp.mat.uniroma2.it' },
  'Danilo Minetto':     { email: 'minetto@axp.mat.uniroma2.it',    mailto: 'mailto:minetto@axp.mat.uniroma2.it' },
  'Giacomo Bortolussi': { email: 'bortolussi@axp.mat.uniroma2.it', mailto: 'mailto:bortolussi@axp.mat.uniroma2.it' },
  'Matteo Tortolano':   { email: 'tortolano@axp.mat.uniroma2.it',  mailto: 'mailto:tortolano@axp.mat.uniroma2.it' },
  'Mattia Gardini':     { email: 'gardini@axp.mat.uniroma2.it',    mailto: 'mailto:gardini@axp.mat.uniroma2.it' }
};

document.querySelectorAll('.contact-card').forEach(card => {
  const nameEl  = card.querySelector('.cc-name');
  const emailEl = card.querySelector('a.cc-email');
  if (nameEl && emailEl) {
    const name   = nameEl.textContent.trim();
    const email  = emailEl.textContent.trim();
    const mailto = emailEl.getAttribute('href') || ('mailto:' + email);
    organiserContacts[name] = { email, mailto };
  }
});

function openOrgModal(name) {
  if (!orgModal || !orgModalText || !orgModalClose) return;
  const info = organiserContacts[name];
  if (!info) return;
  const itHtml = `Vuoi contattare ${name}? Scrivi a:<br>
                  <div style="text-align: center; margin-top: 10px;">
                    <a href="${info.mailto}">${info.email}</a>
                  </div>`;
  const enHtml = `Would you like to contact ${name}? Write to:<br>
                  <div style="text-align: center; margin-top: 10px;">
                    <a href="${info.mailto}">${info.email}</a>
                  </div>`;
  orgModalText.setAttribute('data-it', itHtml);
  orgModalText.setAttribute('data-en', enHtml);
  const currentLang = htmlEl.getAttribute('data-lang') || (langToggle && langToggle.checked ? 'it' : 'en');
  orgModalText.innerHTML = currentLang === 'it' ? itHtml : enHtml;
  orgModalClose.setAttribute('aria-label', currentLang === 'it' ? 'Chiudi' : 'Close');
  orgModal.classList.add('open');
}

function closeOrgModal() {
  if (!orgModal) return;
  orgModal.classList.remove('open');
}

document.querySelectorAll('.organiser-card').forEach(card => {
  const nameEl = card.querySelector('.oc-name');
  const iconEl = card.querySelector('.oc-initials');
  if (!nameEl) return;
  const name = nameEl.textContent.trim();

  if (iconEl) {
    iconEl.setAttribute('role', 'button');
    iconEl.setAttribute('tabindex', '0');
    iconEl.setAttribute('aria-label', `Contact ${name}`);
  }

  card.addEventListener('click', () => openOrgModal(name));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openOrgModal(name);
    }
  });
});

if (orgModal && orgModalClose) {
  orgModalClose.addEventListener('click', closeOrgModal);
  orgModal.addEventListener('click', e => {
    if (e.target === orgModal) closeOrgModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && orgModal.classList.contains('open')) {
      closeOrgModal();
    }
  });
}
