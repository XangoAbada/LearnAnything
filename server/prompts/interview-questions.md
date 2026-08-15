Użytkownik chce nauczyć się tematu: **{{topic}}**.

Ułóż **dokładnie 6 pytań** wstępnych, które pozwolą dobrać poziom, tempo i zakres kursu:

- 3 pytania otwarte o cel i kontekst (po co mu to, co już robił, ile ma czasu),
- 3 pytania **sprawdzające faktyczną wiedzę** z tego tematu — takie, po których odpowiedziach widać
  różnicę między początkującym a średniozaawansowanym. Nie pytaj „jak oceniasz swój poziom".

Pytania sprawdzające wiedzę daj jako `"kind": "wybór"` z 3–4 wariantami odpowiedzi
(jeden poprawny, reszta wiarygodnie błędna). Pozostałe jako `"kind": "otwarte"`.

Nie zadawaj pytań w czacie, nie używaj narzędzi. Zwróć wyłącznie blok ```json:

```json
{ "questions": [
  { "text": "…", "kind": "otwarte" },
  { "text": "…", "kind": "wybór", "options": ["…", "…", "…"] }
]}
```

Wartości `kind` zostają dokładnie takie jak wyżej: `otwarte`, `wybór`. Treść pytań i wariantów
w języku odpowiedzi. Bez pola `id` — nada je serwer.
