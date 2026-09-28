// Pulsante "Copia" sui blocchi di codice. Miglioramento progressivo: senza JS la pagina funziona uguale.
document.querySelectorAll('pre.code').forEach((pre) => {
  if (!navigator.clipboard) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = 'Copia';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.querySelector('code').innerText);
      btn.textContent = 'Copiato';
    } catch {
      btn.textContent = 'Errore';
    }
    setTimeout(() => (btn.textContent = 'Copia'), 1600);
  });
  pre.appendChild(btn);
});

// Menu "Novità": si chiude cliccando fuori, con Esc o scegliendo una voce.
const menu = document.querySelector('.nav-menu');
if (menu) {
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target)) menu.open = false;
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
}
