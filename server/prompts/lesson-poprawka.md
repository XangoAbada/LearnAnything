Lekcja jest gotowa, ale nie przeszła kontroli w przeglądarce. Popraw ją.

## Co jest nie tak

{{raport}}

## Co masz zrobić

Zmień **tylko** `lesson.js`, `lesson.css` albo `index.html` w katalogu roboczym — narzędziem
`Read`, a potem `Write`. Nie dopisuj czwartego pliku i nie zmieniaj struktury sekcji.

- Wizualizacja odwołuje się do komponentu, którego nie ma? Przepisz wywołanie `LA.komponent`
  na komponent **istniejący** w katalogu niżej i dopasuj `dane` do jego kształtu.
- Coś jest rysowane ręcznym `<svg>` albo `<text>`? Zastąp to komponentem. Tekst na sztywnych
  współrzędnych nie zawija się i przy dłuższych danych wyjeżdża poza kadr.
- Elementy nachodzą na siebie albo wystają? Skróć dane podawane komponentowi, rozbij jedną
  wizualizację na dwie albo wybierz komponent lepiej pasujący do tej treści.

Treść merytoryczna lekcji zostaje bez zmian — poprawiasz sposób pokazania, nie materiał.

## Katalog komponentów

{{komponenty}}

## Na koniec

Zwróć **wyłącznie** blok ```json z podsumowaniem lekcji — takim samym jak przy jej pisaniu:

```json
{ "summary": "jedno–dwa zdania o tym, co lekcja faktycznie zawiera",
  "covers": ["pojęcie 1", "pojęcie 2"] }
```
