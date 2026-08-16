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
    'app.settings': 'Ustawienia',
    'app.cancel': 'Anuluj',

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
    'projects.generated': 'Wygenerowane: {ready} z {total}',
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
    'project.empty': 'Ten projekt nie ma jeszcze żadnej lekcji.',
    'project.progress': 'Gotowe: {done} z {total}',
    'project.progress.label': 'Postęp generowania kursu',
    'project.lesson.progress': 'pliki {done}/{total} · tura {turn}',
    'project.lesson.progress.label': 'Postęp generowania lekcji',
    'project.retry': 'Ponów',
    'project.retry.for': 'Ponów generowanie lekcji {title}',
    'project.score': 'Wynik sprawdzianu: {score}%',
    'project.open': 'Otwórz lekcję {title}',
    'project.waiting': 'W kolejce: {n}',
    'project.generateNext': 'Generuj następną lekcję',

    'origin.plan': 'z planu',
    'origin.pośrednia': 'lekcja pośrednia',
    'origin.powtórka': 'powtórka',
    'origin.rozwinięcie': 'rozwinięcie',
    'origin.nowy wątek': 'nowy wątek',

    'suggest.title': 'Propozycje',
    'suggest.create': 'Utwórz lekcję',
    'suggest.source': 'po lekcji: {title}',
    'suggest.thread': 'Zaproponuj nowy wątek',
    'suggest.thread.none': 'Kurs pokrywa temat — nie ma sensownego wątku obok.',
    'suggest.reason.niski-wynik': 'sprawdzian {score}% — pojęcia: {concepts}',
    'suggest.reason.powtarzajace-braki': 'powtarzające się braki: {concepts}',
    'suggest.reason.dobry-wynik': 'sprawdzian {score}% — czas pogłębić: {concepts}',
    'suggest.reason.brak-watku': 'wątek nietknięty w kursie: {topic}',

    'add.open': 'Dodaj lekcję pośrednią',
    'add.extend': 'Rozwiń temat',
    'add.title': 'Nowa lekcja',
    'add.mode': 'Rodzaj',
    'add.after': 'Po lekcji',
    'add.after.end': 'na końcu kursu',
    'add.after.locked': 'Materiał przerobiony jest zamknięty — wstawić można dopiero za ostatnią ukończoną lekcją.',
    'add.brief': 'Czego brakuje?',
    'add.brief.placeholder': 'np. różnica między pętlą a rekurencją',
    'add.submit': 'Dodaj lekcję',
    'add.cancel': 'Anuluj',
    'add.error': 'Nie udało się dodać lekcji.',

    'lesson.project': 'Projekt',
    'lesson.prev': 'Poprzednia',
    'lesson.next': 'Następna',
    'lesson.missing': 'Tej lekcji nie ma albo nie jest jeszcze gotowa.',
    'lesson.frame': 'Treść lekcji: {title}',

    'settings.title': 'Ustawienia modelu',
    'settings.buffer': 'Lekcje generowane z góry',
    'settings.buffer.hint':
      'Ile lekcji ma czekać gotowych przed tobą. Kolejne dogenerują się po ukończeniu lekcji.',
    'settings.parallel': 'Projekty naraz',
    'settings.parallel.hint':
      'Ile kursów generuje się równolegle. W jednym kursie lekcje i tak powstają po kolei.',
    'settings.intro':
      'Każdy etap ma własny model i poziom rozumowania. Cięższe zadania — plan kursu i lekcja — zasługują na mocniejszy model; krótkie pytania wywiadu nie.',
    'settings.stage': 'Etap',
    'settings.model': 'Model',
    'settings.model.for': 'Model dla etapu {stage}',
    'settings.effort': 'Rozumowanie',
    'settings.effort.for': 'Poziom rozumowania dla etapu {stage}',
    'settings.effort.unsupported': 'Ten model nie przyjmuje poziomu rozumowania.',
    'settings.default': 'domyślny',
    'settings.save': 'Zapisz',
    'settings.reset': 'Przywróć domyślne',
    'settings.saved': 'Zapisano.',
    'settings.error': 'Nie udało się zapisać ustawień.',

    'settings.effort.low': 'niski',
    'settings.effort.medium': 'średni',
    'settings.effort.high': 'wysoki',
    'settings.effort.xhigh': 'bardzo wysoki',
    'settings.effort.max': 'maksymalny',

    'stage.wywiad-pytania': 'Pytania wywiadu',
    'stage.wywiad-ocena': 'Ocena wywiadu',
    'stage.plan': 'Plan kursu',
    'stage.lekcja': 'Generowanie lekcji',
    'stage.praktyka': 'Ocena praktyki',
    'stage.sugestie': 'Propozycje lekcji',

    'stage.wywiad-pytania.hint': 'Kilka krótkich pytań o temat — proste zadanie.',
    'stage.wywiad-ocena.hint': 'Odpowiedzi na poziom, tempo i zakres kursu.',
    'stage.plan.hint': 'Struktura całego kursu. Najważniejsza decyzja dydaktyczna.',
    'stage.lekcja.hint': 'Najcięższy etap: teoria, diagramy, demka i sprawdzian.',
    'stage.praktyka.hint': 'Ocena kodu i odpowiedzi z ćwiczeń.',
    'stage.sugestie.hint': 'Propozycje kolejnych lekcji po sprawdzianie.',

    'status.nowy': 'nowy',
    'status.wywiad': 'wywiad',
    'status.plan': 'plan',
    'status.generowanie': 'generowanie',
    'status.w toku': 'w toku',
    'status.gotowy': 'gotowy',
    'status.zaplanowana': 'zaplanowana',
    'status.niewygenerowana': 'niewygenerowana',
    'status.ponawiana': 'ponawiana',
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
    'app.settings': 'Settings',
    'app.cancel': 'Cancel',

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
    'projects.generated': 'Generated: {ready} of {total}',
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
    'project.empty': 'This project has no lessons yet.',
    'project.progress': 'Ready: {done} of {total}',
    'project.progress.label': 'Course generation progress',
    'project.lesson.progress': 'files {done}/{total} · turn {turn}',
    'project.lesson.progress.label': 'Lesson generation progress',
    'project.retry': 'Retry',
    'project.retry.for': 'Retry generating lesson {title}',
    'project.score': 'Quiz score: {score}%',
    'project.open': 'Open lesson {title}',
    'project.waiting': 'Queued: {n}',
    'project.generateNext': 'Generate next lesson',

    'origin.plan': 'from the plan',
    'origin.pośrednia': 'in-between lesson',
    'origin.powtórka': 'revision',
    'origin.rozwinięcie': 'deep dive',
    'origin.nowy wątek': 'new thread',

    'suggest.title': 'Suggestions',
    'suggest.create': 'Create lesson',
    'suggest.source': 'after lesson: {title}',
    'suggest.thread': 'Suggest a new thread',
    'suggest.thread.none': 'The course covers the topic — no sensible thread next to it.',
    'suggest.reason.niski-wynik': 'quiz {score}% — concepts: {concepts}',
    'suggest.reason.powtarzajace-braki': 'recurring gaps: {concepts}',
    'suggest.reason.dobry-wynik': 'quiz {score}% — time to go deeper: {concepts}',
    'suggest.reason.brak-watku': 'thread untouched by the course: {topic}',

    'add.open': 'Add an in-between lesson',
    'add.extend': 'Expand the topic',
    'add.title': 'New lesson',
    'add.mode': 'Kind',
    'add.after': 'After lesson',
    'add.after.end': 'at the end of the course',
    'add.after.locked': 'Completed material is closed — a lesson can only go after the last completed one.',
    'add.brief': 'What is missing?',
    'add.brief.placeholder': 'e.g. the difference between a loop and recursion',
    'add.submit': 'Add lesson',
    'add.cancel': 'Cancel',
    'add.error': 'Could not add the lesson.',

    'lesson.project': 'Project',
    'lesson.prev': 'Previous',
    'lesson.next': 'Next',
    'lesson.missing': 'This lesson does not exist or is not ready yet.',
    'lesson.frame': 'Lesson content: {title}',

    'settings.title': 'Model settings',
    'settings.buffer': 'Lessons generated ahead',
    'settings.buffer.hint':
      'How many lessons stay ready ahead of you. More are generated as you complete lessons.',
    'settings.parallel': 'Projects at once',
    'settings.parallel.hint':
      'How many courses generate in parallel. Within one course lessons are still built in order.',
    'settings.intro':
      'Each stage gets its own model and reasoning level. Heavier work — the course plan and the lesson — deserves a stronger model; short interview questions do not.',
    'settings.stage': 'Stage',
    'settings.model': 'Model',
    'settings.model.for': 'Model for the {stage} stage',
    'settings.effort': 'Reasoning',
    'settings.effort.for': 'Reasoning level for the {stage} stage',
    'settings.effort.unsupported': 'This model does not take a reasoning level.',
    'settings.default': 'default',
    'settings.save': 'Save',
    'settings.reset': 'Restore defaults',
    'settings.saved': 'Saved.',
    'settings.error': 'Could not save the settings.',

    'settings.effort.low': 'low',
    'settings.effort.medium': 'medium',
    'settings.effort.high': 'high',
    'settings.effort.xhigh': 'very high',
    'settings.effort.max': 'maximum',

    'stage.wywiad-pytania': 'Interview questions',
    'stage.wywiad-ocena': 'Interview assessment',
    'stage.plan': 'Course plan',
    'stage.lekcja': 'Lesson generation',
    'stage.praktyka': 'Practice grading',
    'stage.sugestie': 'Lesson suggestions',

    'stage.wywiad-pytania.hint': 'A few short questions about the topic — an easy job.',
    'stage.wywiad-ocena.hint': 'Turns answers into level, pace and scope.',
    'stage.plan.hint': 'The structure of the whole course. The key teaching decision.',
    'stage.lekcja.hint': 'The heaviest stage: theory, diagrams, demos and the quiz.',
    'stage.praktyka.hint': 'Grades code and answers from the exercises.',
    'stage.sugestie.hint': 'Suggests further lessons after the quiz.',

    'status.nowy': 'new',
    'status.wywiad': 'interview',
    'status.plan': 'plan',
    'status.generowanie': 'generating',
    'status.w toku': 'in progress',
    'status.gotowy': 'ready',
    'status.zaplanowana': 'planned',
    'status.niewygenerowana': 'not generated',
    'status.ponawiana': 'retrying',
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
