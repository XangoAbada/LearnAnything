// Potwierdzenie w stylu arkusza zamiast window.confirm — używają go powłoka (app.js)
// i runtime lekcji (runtime.js). Natywny <dialog>: Esc, pułapka fokusu i backdrop
// są po stronie przeglądarki, tu zostaje treść, dwa przyciski i obietnica.
// Domyślny fokus siada na „anuluj” — showModal() bierze pierwszy przycisk w formularzu.

const button = (value, label, className) => {
  const b = document.createElement('button');
  b.type = 'submit';
  b.value = value;
  b.className = className;
  b.textContent = label;
  return b;
};

export function confirmDialog(message, { ok, cancel, danger = false } = {}) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'confirm';

    const form = document.createElement('form');
    form.method = 'dialog';

    const text = document.createElement('p');
    text.textContent = message; // treść od użytkownika (temat projektu) wyłącznie przez textContent

    const row = document.createElement('div');
    row.className = 'confirm-actions';
    row.append(button('', cancel, 'ghost'), button('ok', ok, danger ? 'danger' : 'primary'));

    form.append(text, row);
    dlg.append(form);

    // kliknięcie w tło = anuluj; <dialog> zbiera klik z całego okna, środek łapie <form>
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener('close', () => {
      dlg.remove();
      resolve(dlg.returnValue === 'ok');
    });

    document.body.append(dlg);
    dlg.showModal();
  });
}
