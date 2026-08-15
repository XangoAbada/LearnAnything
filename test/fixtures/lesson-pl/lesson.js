// Jedyne zadanie skryptu lekcji: podać sprawdzian runtime'owi. Ocena, zapis wyniku
// i cała mechanika są wspólne — lekcja nie ma prawa mieć własnej.

LA.quiz([
  {
    id: 'q1',
    typ: 'jednokrotny',
    tekst: 'Co decyduje o wysokości dźwięku?',
    opcje: ['Amplituda', 'Częstotliwość', 'Barwa'],
    poprawne: [1],
    uzasadnienie: 'Wysokość to liczba drgań na sekundę, czyli częstotliwość.',
  },
  {
    id: 'q2',
    typ: 'wielokrotny',
    tekst: 'Które zdania o alikwotach są prawdziwe?',
    opcje: [
      'Ich częstotliwości są wielokrotnościami składowej podstawowej',
      'Odpowiadają za barwę dźwięku',
      'Zmieniają słyszaną wysokość dźwięku',
    ],
    poprawne: [0, 1],
    uzasadnienie: 'Alikwoty składają się na barwę, ale wysokość niesie składowa podstawowa.',
  },
  {
    id: 'q3',
    typ: 'prawda-falsz',
    tekst: 'Podwojenie częstotliwości podnosi dźwięk o oktawę.',
    poprawne: [0],
    uzasadnienie: 'Oktawa to stosunek 2:1 — z 220 Hz robi się 440 Hz.',
  },
]);
