// The lesson script only hands the quiz to the runtime. Grading, saving the score and the
// whole mechanism are shared — a lesson is not allowed to have its own.

LA.quiz([
  {
    id: 'q1',
    typ: 'jednokrotny',
    tekst: 'What decides the pitch of a sound?',
    opcje: ['Amplitude', 'Frequency', 'Timbre'],
    poprawne: [1],
    uzasadnienie: 'Pitch is the number of vibrations per second, that is the frequency.',
  },
  {
    id: 'q2',
    typ: 'wielokrotny',
    tekst: 'Which statements about overtones are true?',
    opcje: [
      'Their frequencies are multiples of the fundamental',
      'They are responsible for timbre',
      'They change the pitch you hear',
    ],
    poprawne: [0, 1],
    uzasadnienie: 'Overtones make the timbre, but the pitch comes from the fundamental.',
  },
  {
    id: 'q3',
    typ: 'prawda-falsz',
    tekst: 'Doubling the frequency raises the sound by an octave.',
    poprawne: [0],
    uzasadnienie: 'An octave is a 2:1 ratio — 220 Hz becomes 440 Hz.',
  },
]);
