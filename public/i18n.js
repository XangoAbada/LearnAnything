// Dwa słowniki i t(). Bez biblioteki — tyle wystarczy dla dwóch języków.
// Reguła projektu: żaden string widoczny dla użytkownika nie stoi poza tym plikiem.
// Klucze: obszar.element[.wariant]. Enumy danych zostają po polsku, tu żyją ich etykiety.

export const LANGS = ['pl', 'en'];
const KEY = 'learnanything:lang';

export const dict = {
  pl: {
    'app.title': 'LearnAnything',
    'app.loading': 'Ładuję…',
    'app.thinking': 'Myślę…',
    'app.error': 'Coś poszło nie tak.',
    'app.back': 'Projekty',
    'app.theme.toggle': 'Przełącz motyw',
    'app.theme.jasny': 'Jasny',
    'app.theme.ciemny': 'Ciemny',
    'app.lang.toggle': 'Przełącz język interfejsu',

    'lang.pl': 'polski',
    'lang.en': 'angielski',

    'projects.title': 'Projekty nauki',
    'projects.empty': 'Nie ma jeszcze żadnego projektu. Zacznij od tematu.',
    'projects.new': 'Nowy projekt',
    'projects.new.topic': 'Czego chcesz się nauczyć?',
    'projects.new.topic.placeholder': 'np. Teoria muzyki',
    'projects.new.language': 'Język kursu',
    'projects.new.submit': 'Utwórz projekt',
    'projects.progress': 'Ukończone: {done} z {total}',
    'projects.language': 'Język kursu: {lang}',
    'spec.lessons': 'Lekcje',
    'spec.language': 'Język',
    'spec.status': 'Stan',
    'projects.open': 'Otwórz projekt {topic}',
    'projects.delete': 'Usuń',
    'projects.delete.confirm': 'Usunąć projekt „{topic}” razem ze wszystkimi lekcjami?',

    'interview.title': 'Wywiad: {topic}',
    'interview.progress': 'Pytanie {n} z {total}',
    'interview.answer': 'Twoja odpowiedź',
    'interview.answer.placeholder': 'Odpowiedz własnymi słowami…',
    'interview.next': 'Dalej',
    'interview.finish': 'Zakończ',
    'interview.skip': 'Pomiń wywiad',

    'summary.title': 'Parametry kursu',
    'summary.level': 'Poziom',
    'summary.pace': 'Tempo',
    'summary.scope': 'Zakres',
    'summary.none': 'Wywiad pominięty — parametry domyślne.',
    'summary.plan': 'Zaplanuj kurs',

    'plan.title': 'Plan kursu',
    'plan.params': 'Poziom: {level} · Tempo: {pace} · Zakres: {scope}',
    'plan.range': 'Lekcji: {n} · widełki dla tego zakresu: {min}–{max}',
    'plan.lesson.title': 'Tytuł lekcji {n}',
    'plan.accept': 'Akceptuję',
    'plan.recalc': 'Przelicz plan',
    'plan.comment.placeholder': 'Co poprawić? np. więcej praktyki, krócej',
    'plan.error.model':
      'Nie udało się ułożyć planu mieszczącego się w widełkach. Przelicz plan, najlepiej z komentarzem.',

    'project.lessons': 'Lekcje',
    'project.soon': 'Generowanie i widok lekcji dochodzą w kolejnej fazie.',

    'status.nowy': 'nowy',
    'status.wywiad': 'wywiad',
    'status.plan': 'plan',
    'status.generowanie': 'generowanie',
    'status.gotowy': 'gotowy',
    'status.zaplanowana': 'zaplanowana',
    'status.generowana': 'generowana',
    'status.gotowa': 'gotowa',
    'status.ukończona': 'ukończona',
    'status.błąd': 'błąd',

    'level.początkujący': 'początkujący',
    'level.średni': 'średni',
    'level.zaawansowany': 'zaawansowany',
    'pace.wolne': 'wolne',
    'pace.normalne': 'normalne',
    'pace.szybkie': 'szybkie',
    'scope.podstawy': 'podstawy',
    'scope.standardowy': 'standardowy',
    'scope.szeroki': 'szeroki',
    'verdict.poprawnie': 'poprawnie',
    'verdict.częściowo': 'częściowo',
    'verdict.niepoprawnie': 'niepoprawnie',
  },

  en: {
    'app.title': 'LearnAnything',
    'app.loading': 'Loading…',
    'app.thinking': 'Thinking…',
    'app.error': 'Something went wrong.',
    'app.back': 'Projects',
    'app.theme.toggle': 'Toggle theme',
    'app.theme.jasny': 'Light',
    'app.theme.ciemny': 'Dark',
    'app.lang.toggle': 'Switch interface language',

    'lang.pl': 'Polish',
    'lang.en': 'English',

    'projects.title': 'Learning projects',
    'projects.empty': 'No projects yet. Start with a topic.',
    'projects.new': 'New project',
    'projects.new.topic': 'What do you want to learn?',
    'projects.new.topic.placeholder': 'e.g. Music theory',
    'projects.new.language': 'Course language',
    'projects.new.submit': 'Create project',
    'projects.progress': 'Completed: {done} of {total}',
    'projects.language': 'Course language: {lang}',
    'spec.lessons': 'Lessons',
    'spec.language': 'Language',
    'spec.status': 'State',
    'projects.open': 'Open project {topic}',
    'projects.delete': 'Delete',
    'projects.delete.confirm': 'Delete project “{topic}” with all its lessons?',

    'interview.title': 'Interview: {topic}',
    'interview.progress': 'Question {n} of {total}',
    'interview.answer': 'Your answer',
    'interview.answer.placeholder': 'Answer in your own words…',
    'interview.next': 'Next',
    'interview.finish': 'Finish',
    'interview.skip': 'Skip interview',

    'summary.title': 'Course parameters',
    'summary.level': 'Level',
    'summary.pace': 'Pace',
    'summary.scope': 'Scope',
    'summary.none': 'Interview skipped — default parameters.',
    'summary.plan': 'Plan the course',

    'plan.title': 'Course plan',
    'plan.params': 'Level: {level} · Pace: {pace} · Scope: {scope}',
    'plan.range': 'Lessons: {n} · range for this scope: {min}–{max}',
    'plan.lesson.title': 'Title of lesson {n}',
    'plan.accept': 'Accept',
    'plan.recalc': 'Recalculate plan',
    'plan.comment.placeholder': 'What to change? e.g. more practice, shorter',
    'plan.error.model':
      'Could not build a plan within the allowed range. Recalculate it, ideally with a comment.',

    'project.lessons': 'Lessons',
    'project.soon': 'Generation and the lesson view arrive in the next phase.',

    'status.nowy': 'new',
    'status.wywiad': 'interview',
    'status.plan': 'plan',
    'status.generowanie': 'generating',
    'status.gotowy': 'ready',
    'status.zaplanowana': 'planned',
    'status.generowana': 'generating',
    'status.gotowa': 'ready',
    'status.ukończona': 'completed',
    'status.błąd': 'error',

    'level.początkujący': 'beginner',
    'level.średni': 'intermediate',
    'level.zaawansowany': 'advanced',
    'pace.wolne': 'slow',
    'pace.normalne': 'normal',
    'pace.szybkie': 'fast',
    'scope.podstawy': 'basics',
    'scope.standardowy': 'standard',
    'scope.szeroki': 'broad',
    'verdict.poprawnie': 'correct',
    'verdict.częściowo': 'partly',
    'verdict.niepoprawnie': 'incorrect',
  },
};

let lang = null;

/** localStorage → navigator.language → 'pl'. Wynik zapamiętany: t() woła to przy każdym stringu. */
export function getLang() {
  if (lang) return lang;
  const saved = globalThis.localStorage?.getItem(KEY);
  if (LANGS.includes(saved)) return (lang = saved);
  const nav = globalThis.navigator?.language?.slice(0, 2);
  return (lang = LANGS.includes(nav) ? nav : 'pl');
}

/** Zmiana języka nie przeładowuje strony — nasłuch 'langchange' przerysowuje bieżący ekran. */
export function setLang(next) {
  if (!LANGS.includes(next)) return;
  lang = next;
  localStorage.setItem(KEY, next);
  document.documentElement.lang = next;
  window.dispatchEvent(new Event('langchange'));
}

/** Brak klucza zwraca klucz — brak tłumaczenia ma być widoczny, a nie znikać z ekranu. */
export function t(key, vars) {
  const text = dict[getLang()][key];
  if (text === undefined) {
    console.warn(`i18n: brak klucza ${key}`);
    return key;
  }
  return vars ? text.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m)) : text;
}
