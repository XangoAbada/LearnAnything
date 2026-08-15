Użytkownik chce nauczyć się tematu: **{{topic}}**. Poniżej wywiad wstępny.

{{qa}}

Oceń, jaki kurs mu się należy:

- `level` — jak wiele wie **na starcie**. Oceniaj po odpowiedziach na pytania sprawdzające wiedzę,
  nie po deklaracjach. Brak odpowiedzi lub odpowiedzi błędne → `początkujący`.
- `pace` — gęstość jednej lekcji. Mało czasu albo temat świeży → `wolne`; solidne podstawy
  i konkretny cel → `szybkie`; w pozostałych przypadkach → `normalne`.
- `scope` — jak szeroki ma być kurs. Wąski, konkretny cel → `podstawy`; „chcę ogarnąć temat" →
  `standardowy`; ambicja przerobienia dziedziny → `szeroki`.
- `summary` — zdanie lub dwa o tym, co użytkownik już umie i po co mu ten kurs. To trafi do
  promptów kolejnych lekcji, więc pisz konkretnie, w języku odpowiedzi.

Zwróć wyłącznie blok ```json:

```json
{ "level": "początkujący", "pace": "normalne", "scope": "standardowy", "summary": "…" }
```

Dozwolone wartości — przepisz dokładnie jedną z nich, bez tłumaczenia:
`level`: początkujący · średni · zaawansowany
`pace`: wolne · normalne · szybkie
`scope`: podstawy · standardowy · szeroki
