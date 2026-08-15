Ułóż plan kursu na temat: **{{topic}}**.

Parametry ustalone w wywiadzie:
- poziom startowy: `{{level}}`
- tempo: `{{pace}}` (steruje gęstością pojedynczej lekcji, **nie** liczbą lekcji)
- zakres: `{{scope}}`
- co użytkownik już umie: {{summary}}

{{comment}}

## Twarde wymagania

1. **Liczba lekcji: od {{min}} do {{max}}.** To warunek konieczny — plan poza widełkami zostanie
   odrzucony.
2. Kolejność ma być drogą, nie spisem treści: każda lekcja opiera się na poprzednich, żadna nie
   wymaga wiedzy z lekcji późniejszej.
3. Pierwsza lekcja musi być sensowna dla poziomu `{{level}}` — nie zaczynaj od rzeczy, które
   użytkownik zna według wywiadu.
4. `title` — konkretny, do 60 znaków, bez numeru lekcji. `brief` — jedno zdanie o tym, co lekcja
   wnosi.

Nie używaj narzędzi. Zwróć wyłącznie blok ```json:

```json
{ "lessons": [
  { "title": "…", "brief": "…" },
  { "title": "…", "brief": "…" }
]}
```

Bez pól `order` i `id` — numerację nadaje serwer.
