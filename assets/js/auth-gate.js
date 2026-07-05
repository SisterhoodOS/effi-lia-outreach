// Effi Lia - Outreach — shared team password gate.
// Simple client-side check: this is a low-stakes internal access gate, not
// cryptographic security (the Supabase anon key is already public in the
// bundle, same trust model as monika-mission-control).

const EFFI_PASSWORD = 'OUTREACH';
const EFFI_AUTH_KEY = 'effi_lia_auth_ok';

(function initAuthGate() {
  try {
    const gate = document.getElementById('auth-gate');
    const app = document.getElementById('app');
    const input = document.getElementById('auth-gate-input');
    const submit = document.getElementById('auth-gate-submit');
    const errorEl = document.getElementById('auth-gate-error');
    const showToggle = document.getElementById('auth-gate-show');

    function unlock() {
      gate.hidden = true;
      gate.style.display = 'none';
      app.hidden = false;
      app.style.display = '';
      document.dispatchEvent(new CustomEvent('effi:unlocked'));
    }

    function tryUnlock() {
      try {
        if (input.value.trim() === EFFI_PASSWORD) {
          localStorage.setItem(EFFI_AUTH_KEY, '1');
          errorEl.hidden = true;
          unlock();
        } else {
          errorEl.hidden = false;
        }
      } catch (e) {
        console.error('Effi auth-gate error', e);
        alert('Something went wrong unlocking the page: ' + e.message);
      }
    }

    if (showToggle) {
      showToggle.addEventListener('change', () => {
        input.type = showToggle.checked ? 'text' : 'password';
      });
    }

    // Password gate temporarily disabled — auto-unlock for everyone.
    // TODO: re-enable once the login issue is fully diagnosed.
    unlock();

    submit.addEventListener('click', tryUnlock);
    submit.addEventListener('touchend', tryUnlock);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryUnlock();
    });
  } catch (e) {
    console.error('Effi auth-gate init error', e);
    alert('Page failed to set up the login form: ' + e.message);
  }
})();
