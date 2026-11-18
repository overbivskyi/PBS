// Two languages: English (default, the presentation language) and Ukrainian.
// The English text is the key: t('Book') returns 'Забронювати' in Ukrainian and 'Book' in English.
// A link with ?lang=uk opens the Ukrainian version.
// No React or browser code at import time, so node scripts (npm run check) can use it.

const KEY = 'pbs.lang'
export const LANGS = ['en', 'uk']

function initialLang() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang')
    if (LANGS.includes(fromUrl)) {
      localStorage.setItem(KEY, fromUrl)
      return fromUrl
    }
    const saved = localStorage.getItem(KEY)
    if (LANGS.includes(saved)) return saved
  } catch {
    // node or blocked storage
  }
  return 'en'
}

let lang = initialLang()
if (typeof document !== 'undefined') document.documentElement.lang = lang

export function getLang() {
  return lang
}

export function setLang(next) {
  lang = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // ignore
  }
  document.documentElement.lang = next
  window.dispatchEvent(new Event('pbs-lang'))
}

// Server: sets the language for one request (no browser storage or events).
export function setRequestLang(next) {
  lang = LANGS.includes(next) ? next : 'en'
}

export function t(en, vars) {
  let s = lang === 'uk' ? (UK[en] ?? en) : en
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v)
  return s
}

// Plural forms: en [one, many], uk [one, few, many].
export function plural(n, en, uk) {
  if (lang !== 'uk') return (n === 1 ? en[0] : en[1]).replace('{n}', n)
  const m10 = n % 10
  const m100 = n % 100
  const form = m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2
  return uk[form].replace('{n}', n)
}

export const locale = () => (lang === 'uk' ? 'uk-UA' : 'en-GB')

// ---------- demo data in Ukrainian ----------

const DATA_UK = {
  // areas
  Podil: 'Поділ', 'City Center': 'Центр', Pechersk: 'Печерськ', Obolon: 'Оболонь', Holosiiv: 'Голосіїв',
  Solomianka: 'Солом’янка', 'Livyi Bereh': 'Лівий берег', Darnytsia: 'Дарниця', Troieshchyna: 'Троєщина',
  // styles and style groups
  Portrait: 'Портрет', Family: 'Сімейна', 'Love story': 'Love story', Wedding: 'Весілля', Event: 'Івент', Product: 'Предметна',
  People: 'Люди', Events: 'Події', Commercial: 'Комерція',
  // photographer first and last names
  Olena: 'Олена', Andrii: 'Андрій', Iryna: 'Ірина', Taras: 'Тарас', Sofiia: 'Софія', Maksym: 'Максим', Kateryna: 'Катерина',
  Dmytro: 'Дмитро', Yuliia: 'Юлія', Bohdan: 'Богдан', Nataliia: 'Наталія', Oleksandr: 'Олександр', Mariia: 'Марія', Roman: 'Роман',
  Viktoriia: 'Вікторія', Serhii: 'Сергій', Anastasiia: 'Анастасія', Yurii: 'Юрій', Daryna: 'Дарина', Ostap: 'Остап',
  Kovalenko: 'Коваленко', Melnyk: 'Мельник', Bondar: 'Бондар', Shevchuk: 'Шевчук', Lysenko: 'Лисенко', Tkachenko: 'Ткаченко',
  Kravets: 'Кравець', Moroz: 'Мороз', Savchuk: 'Савчук', Oliinyk: 'Олійник', Polishchuk: 'Поліщук', Rudenko: 'Руденко',
  Marchenko: 'Марченко', Hnatiuk: 'Гнатюк', Zinchenko: 'Зінченко', Pavlenko: 'Павленко', Kostenko: 'Костенко',
  Levchenko: 'Левченко', Tymoshenko: 'Тимошенко', Danyliuk: 'Данилюк',
  // client first names
  Anna: 'Анна', Ivan: 'Іван', Oksana: 'Оксана', Petro: 'Петро', Halyna: 'Галина', Mykhailo: 'Михайло', Liudmyla: 'Людмила',
  Vasyl: 'Василь', Tetiana: 'Тетяна', Artem: 'Артем', Alina: 'Аліна', Denys: 'Денис',
  // calendar events
  'Personal event': 'Особиста подія', 'Studio rent': 'Оренда студії', 'Editing day': 'День обробки', Doctor: 'Лікар',
  // streets
  'Khreshchatyk St': 'вул. Хрещатик', 'Sahaidachnoho St': 'вул. Сагайдачного', 'Obolonska Embankment': 'Оболонська набережна',
  'Lesi Ukrainky Blvd': 'бульв. Лесі Українки', 'Holosiivskyi Ave': 'Голосіївський просп.', 'Povitroflotskyi Ave': 'Повітрофлотський просп.',
  'Dniprovska Embankment': 'Дніпровська набережна', 'Kharkivske Hwy': 'Харківське шосе', 'Zakrevskoho St': 'вул. Закревського',
  'Kontraktova Sq': 'Контрактова площа', 'Velyka Vasylkivska St': 'вул. Велика Васильківська',
  // skills
  'Natural light': 'Природне світло', 'Posing guidance': 'Допомога з позуванням', Retouching: 'Ретуш',
  'Working with kids': 'Робота з дітьми', 'Outdoor sessions': 'Зйомки надворі', 'Candid moments': 'Живі моменти',
  'Couple posing': 'Позування для пар', 'Golden hour': 'Золота година', Storytelling: 'Сторітелінг',
  'Full-day coverage': 'Зйомка на весь день', 'Ceremony timing': 'Таймінг церемонії', 'Group photos': 'Групові фото',
  'Fast reportage': 'Швидкий репортаж', 'Low light': 'Слабке освітлення', 'Same-day previews': 'Перші фото в той самий день',
  'Studio lighting': 'Студійне світло', 'Flat lay': 'Flat lay', 'Clean backgrounds': 'Чисті фони',
  // gear (only the words, brand names stay)
  'Godox V1 flash': 'Спалах Godox V1', 'Reflector 5-in-1': 'Рефлектор 5-в-1', 'Softbox kit': 'Набір софтбоксів',
  // about sentences
  'I help people feel calm in front of the camera and look like themselves.': 'Допомагаю людям почуватися спокійно перед камерою і бути собою.',
  'I photograph families as they are: busy, loud and happy.': 'Знімаю сім’ї такими, якими вони є: метушливими, гучними й щасливими.',
  'I tell the story of a couple with light, places and small gestures.': 'Розповідаю історію пари через світло, місця й дрібні жести.',
  'I cover the whole day so the couple can forget about the camera.': 'Знімаю весь день, щоб пара могла забути про камеру.',
  'I shoot events fast and quietly, and send the first photos the same evening.': 'Знімаю події швидко й непомітно, а перші фото надсилаю того ж вечора.',
  'I make clean product photos for shops, menus and social media.': 'Роблю чисті предметні фото для магазинів, меню й соцмереж.',
  'Based in Kyiv for 6 years.': 'Працюю в Києві 6 років.',
  'I shoot in any weather.': 'Знімаю в будь-яку погоду.',
  'Photos ready in 5 days.': 'Фото готові за 5 днів.',
  'I studied photography in Lviv.': 'Вчився фотографії у Львові.',
  // reviews
  'Very calm and kind, the photos came out natural.': 'Дуже спокійна й привітна зйомка, фото вийшли природними.',
  'Came on time, knew the best spots, photos in 4 days.': 'Прийшли вчасно, знали найкращі локації, фото за 4 дні.',
  'Our kids loved the session. Great colors.': 'Дітям дуже сподобалася зйомка. Чудові кольори.',
  'Clear communication and beautiful light work.': 'Зрозуміле спілкування і гарна робота зі світлом.',
  'Exactly the style we wanted. Will book again.': 'Саме той стиль, який ми хотіли. Забронюємо ще.',
  'Fast, friendly and very professional.': 'Швидко, привітно й дуже професійно.',
  'Helped us relax, the photos feel alive.': 'Допомогли нам розслабитися, фото вийшли живими.',
}

// Translates a demo data value (names, areas, sentences). Unknown text is returned as is.
export function d(text) {
  if (lang !== 'uk' || text == null) return text
  if (DATA_UK[text]) return DATA_UK[text]
  // whole sentences: "Sentence one. Sentence two."
  const parts = String(text).split(/(?<=\.)\s+/)
  if (parts.length > 1 && parts.every((p) => DATA_UK[p])) return parts.map((p) => DATA_UK[p]).join(' ')
  // generated addresses: "12 Kharkivske Hwy"
  const m = String(text).match(/^(\d+) (.+)$/)
  if (m && DATA_UK[m[2]]) return `${DATA_UK[m[2]]}, ${m[1]}`
  return text
}

// ---------- interface text in Ukrainian ----------

const UK = {
  // header, footer
  'Find a photographer': 'Знайти фотографа',
  'For photographers': 'Для фотографів',
  'Log in': 'Увійти',
  'Sign up': 'Реєстрація',
  'My bookings': 'Мої бронювання',
  Rules: 'Правила',
  'Profile settings': 'Налаштування профілю',
  'Log out': 'Вийти',
  'Open menu': 'Відкрити меню',
  'Team view': 'Режим команди',
  'Team view: a debugging tool for the team': 'Режим команди: інструмент для налагодження',
  Client: 'Клієнт',
  Photographer: 'Фотограф',
  '(tester)': '(тестер)',
  Language: 'Мова',
  'Course demo: generated profiles and real testers. No real payments.': 'Навчальне демо: згенеровані профілі та реальні тестери. Без реальних оплат.',
  'Terms of service': 'Умови користування',
  'Privacy policy': 'Політика конфіденційності',
  'Reset demo data': 'Скинути демо-дані',
  'Delete all accounts, bookings and edits made in this browser?': 'Видалити всі акаунти, бронювання та зміни, зроблені в цьому браузері?',
  'Page not found.': 'Сторінку не знайдено.',

  // common
  New: 'Новий',
  'Loading…': 'Завантаження…',
  'Try again': 'Спробувати ще раз',
  Close: 'Закрити',
  Cancel: 'Скасувати',
  'Fill in this field': 'Заповніть це поле',
  Choose: 'Оберіть',
  '{price}/h': '{price}/год',
  '{n} min': '{n} хв',
  min: 'хв',
  UAH: 'грн',
  Kyiv: 'Київ',

  // search form
  Styles: 'Стилі',
  '1 to 3': 'від 1 до 3',
  Area: 'Район',
  Date: 'Дата',
  'Start time': 'Час початку',
  Duration: 'Тривалість',
  'Budget per hour': 'Бюджет за годину',
  'Find photographers': 'Знайти фотографів',
  'Update results': 'Оновити результати',

  // landing
  'Photographers ready across Kyiv': 'Фотографи по всьому Києву',
  'Book a photographer': 'Забронюйте фотографа',
  'in two taps': 'у два дотики',
  'Tell us what you need. We show only photographers who are free and can get there on time.':
    'Розкажіть, що вам потрібно. Ми покажемо лише тих фотографів, які вільні й встигнуть приїхати вчасно.',
  '{rating} average rating': 'Середня оцінка {rating}',
  'From {n} completed shoots': 'За {n} проведеними зйомками',
  'Try the demo search': 'Спробувати демо-пошук',
  'Best match found': 'Знайдено найкращий збіг',
  'Free at {time} in {area}': 'Вільний о {time}, район {area}',
  'How it works': 'Як це працює',
  'From idea to booked in minutes': 'Від ідеї до бронювання за кілька хвилин',
  'No endless messages. No schedule clashes. Just the right person at the right time.':
    'Без безкінечних листувань і накладок у розкладі. Потрібна людина в потрібний час.',
  'Tell us what you need': 'Розкажіть, що вам потрібно',
  'Choose your style, place, time and budget. It takes less than a minute.': 'Оберіть стиль, місце, час і бюджет. Це займе менше хвилини.',
  'Pick the best match': 'Оберіть найкращий збіг',
  'Compare photographers who are free and can get there on time.': 'Порівняйте фотографів, які вільні й встигнуть приїхати.',
  'Pay 30% and the shoot is in both calendars': 'Сплатіть 30%, і зйомка з’явиться в обох календарях',
  'The deposit books the time. You pay the rest after the shoot.': 'Завдаток бронює час. Решту ви сплачуєте після зйомки.',
  'Top in Kyiv': 'Найкращі в Києві',
  'Photographers clients love': 'Фотографи, яких люблять клієнти',
  'View all photographers': 'Усі фотографи',
  'Get prepaid bookings without schedule clashes': 'Передоплачені бронювання без накладок у розкладі',
  'Set your rules once. We show clients only the times you can really make, and the deposit is paid before every shoot.':
    'Налаштуйте правила один раз. Ми показуємо клієнтам лише той час, коли ви справді встигнете, а завдаток сплачується до кожної зйомки.',
  'You control your prices and availability': 'Ціни й вільний час визначаєте ви',
  '30% deposit before every shoot': 'Завдаток 30% до кожної зйомки',
  'Travel and break times counted for you': 'Час на дорогу й перерви рахуємо ми',
  'I am a photographer': 'Я фотограф',

  // results
  'Back to home': 'На головну',
  'Photographers for your shoot': 'Фотографи для вашої зйомки',
  '{styles} in {area} · {date} at {time} · {duration} minutes': '{styles} · {area} · {date} о {time} · {duration} хв',
  'Fill in the search to see photographers who are free at your time.': 'Заповніть пошук, щоб побачити фотографів, вільних у ваш час.',
  'Finding photographers…': 'Шукаємо фотографів…',
  'We could not load the results. Try again.': 'Не вдалося завантажити результати. Спробуйте ще раз.',
  'your search': 'під ваш запит',
  'All free at {time} and within budget': 'Усі вільні о {time} і в межах бюджету',
  'Sort by': 'Сортувати',
  'Fit score': 'Відповідність',
  Price: 'Ціна',
  Rating: 'Рейтинг',
  'No photographer is free at this time.': 'У цей час немає вільних фотографів.',
  'Change the date': 'Змінити дату',
  'More options': 'Інші варіанти',
  'Close alternatives': 'Близькі альтернативи',
  'Almost a fit. Each card shows the one thing that differs from your search.': 'Майже підходять. На кожній картці видно, що саме відрізняється від запиту.',

  // photographer card
  'Best match': 'Найкращий збіг',
  'Why this score': 'Чому така оцінка',
  fit: 'збіг',
  Style: 'Стиль',
  Time: 'Час',
  'Travels up to {n} min': 'Їздить до {n} хв',
  'Free start times': 'Вільний час початку',
  '{total} total': 'Разом {total}',
  Book: 'Забронювати',
  'View profile': 'Профіль',

  // profile
  'We could not load this profile. Try again.': 'Не вдалося завантажити профіль. Спробуйте ще раз.',
  'Back to results': 'До результатів',
  ' / hour': ' / год',
  'Check availability': 'Вільний час',
  'Meet {name}': 'Знайомтеся: {name}',
  About: 'Про себе',
  'No description yet.': 'Опису ще немає.',
  Skills: 'Навички',
  Gear: 'Техніка',
  'Client stories': 'Відгуки клієнтів',
  Reviews: 'Відгуки',
  'We could not load the reviews.': 'Не вдалося завантажити відгуки.',
  'No reviews yet.': 'Відгуків ще немає.',
  'Verified booking': 'Підтверджене бронювання',
  'Selected work': 'Вибрані роботи',
  Portfolio: 'Портфоліо',
  'No photos yet.': 'Фото ще немає.',
  'Open photo {n}': 'Відкрити фото {n}',
  'Previous photo': 'Попереднє фото',
  'Next photo': 'Наступне фото',
  'Choose a free time': 'Оберіть вільний час',
  'Previous 7 days': 'Попередні 7 днів',
  'Next 7 days': 'Наступні 7 днів',
  'Start times for a {d}-minute shoot in {area}. Free times already include travel and break rules.':
    'Час початку для зйомки на {d} хв, район {area}. Вільний час уже враховує дорогу й перерви.',
  '{time} is not free': '{time} зайнято',
  'Nearest free times': 'Найближчий вільний час',
  'We could not load the free times. Try again.': 'Не вдалося завантажити вільний час. Спробуйте ще раз.',
  'No free times': 'Немає вільного часу',
  'Your selected time': 'Обраний час',
  'Pick a free time above': 'Оберіть вільний час вище',
  'Book this time': 'Забронювати цей час',

  // booking
  'Enter a phone number like +380 67 123 45 67': 'Введіть номер у форматі +380 67 123 45 67',
  'Enter an email like name@example.com': 'Введіть email у форматі name@example.com',
  'Please agree to continue': 'Щоб продовжити, підтвердіть згоду',
  'This booking link is not complete.': 'Посилання на бронювання неповне.',
  'We could not load this photographer. Try again.': 'Не вдалося завантажити фотографа. Спробуйте ще раз.',
  'Log in or sign up to book': 'Увійдіть або зареєструйтеся, щоб забронювати',
  'Your photographer, date and time stay selected.': 'Обраний фотограф, дата й час збережуться.',
  'Back to profile': 'До профілю',
  'Last step': 'Останній крок',
  'Book your shoot': 'Бронювання зйомки',
  'Check the details and pay the deposit. {name} gets the booking at once.': 'Перевірте деталі й сплатіть завдаток. Фотограф одразу отримає бронювання.',
  'Check the details and pay the deposit. The photographer gets the booking at once.': 'Перевірте деталі й сплатіть завдаток. Фотограф одразу отримає бронювання.',
  'This time is no longer free': 'Цей час уже зайнятий',
  'No free times left on this day.': 'На цей день вільного часу не залишилося.',
  'Pick another day': 'Оберіть інший день',
  'We could not complete the payment. Try again.': 'Не вдалося провести оплату. Спробуйте ще раз.',
  'Shoot details': 'Деталі зйомки',
  'Where should {name} meet you?': 'Де {name} має вас зустріти?',
  'Exact meeting place': 'Точне місце зустрічі',
  'Street, building, or landmark': 'Вулиця, будинок або орієнтир',
  'Anything the photographer should know': 'Що варто знати фотографу',
  Optional: 'Необов’язково',
  'Tell {name} about the mood, people, or any special requests…': 'Розкажіть про настрій, людей чи особливі побажання…',
  'Your contact details': 'Ваші контакти',
  'Filled in from your account.': 'Заповнено з вашого акаунта.',
  Name: 'Ім’я',
  Phone: 'Телефон',
  Email: 'Email',
  'I agree to the': 'Я погоджуюся з',
  terms: 'умовами',
  'and the cancellation rules': 'і правилами скасування',
  'Pay deposit {amount}': 'Сплатити завдаток {amount}',
  'Your photographer': 'Ваш фотограф',
  'Change time': 'Змінити час',
  '{price}/h × {d} min / 60': '{price}/год × {d} хв / 60',
  'Pay now: 30% deposit': 'Зараз: завдаток 30%',
  'Pay after the shoot: 70%': 'Після зйомки: 70%',
  'The deposit goes to the photographer only after the shoot': 'Фотограф отримує завдаток лише після зйомки',
  'Demo payment': 'Демо-оплата',
  'Demo payment, no money is charged.': 'Демо-оплата, гроші не списуються.',
  Deposit: 'Завдаток',
  'Checking the time…': 'Перевіряємо час…',
  'Confirm payment': 'Підтвердити оплату',

  // confirmation
  'We could not find this booking.': 'Не вдалося знайти це бронювання.',
  'Photo shoot with {name}': 'Фотозйомка з {name}',
  'Booking #{id}': 'Бронювання #{id}',
  'Your shoot is booked': 'Зйомку заброньовано',
  'The deposit is paid. {name} has the shoot in the calendar.': 'Завдаток сплачено. Зйомка вже в календарі фотографа.',
  'Date & time': 'Дата й час',
  Address: 'Адреса',
  'Deposit paid': 'Завдаток сплачено',
  'Left to pay': 'Залишок',
  '{amount} after the shoot': '{amount} після зйомки',
  "Added to the photographer's calendar": 'Додано до календаря фотографа',
  'Your time is reserved.': 'Ваш час зарезервовано.',
  'Add to my calendar': 'Додати до мого календаря',

  // auth
  '“The easiest way to turn a moment into something you can keep.”': '«Найпростіший спосіб зберегти мить назавжди.»',
  'Real people. Right place. Right time.': 'Справжні люди. Потрібне місце. Потрібний час.',
  'Join Snaply': 'Приєднуйтеся до Snaply',
  'Create your account': 'Створіть акаунт',
  'One account for your bookings, or for your photo business.': 'Один акаунт для ваших бронювань або для вашої фотосправи.',
  'Account type': 'Тип акаунта',
  'I want to book a photographer': 'Хочу забронювати фотографа',
  'I’m looking for a shoot': 'Шукаю зйомку',
  'I want to get bookings': 'Хочу отримувати бронювання',
  'First name': 'Ім’я',
  'Last name': 'Прізвище',
  Password: 'Пароль',
  'At least 8 characters': 'Щонайменше 8 символів',
  'Use at least 8 characters': 'Використайте щонайменше 8 символів',
  'terms of service': 'умовами користування',
  'and the': 'та',
  'privacy policy': 'політикою конфіденційності',
  '. I understand this is a course demo.': '. Я розумію, що це навчальне демо.',
  'Create account': 'Створити акаунт',
  'I already have an account': 'У мене вже є акаунт',
  'Welcome back': 'З поверненням',
  'Log in to Snaply': 'Вхід у Snaply',
  'Enter your details to continue.': 'Введіть свої дані, щоб продовжити.',
  'Your password': 'Ваш пароль',
  'Create an account': 'Створити акаунт',
  "Demo: accounts are saved only in this browser until the team's server is ready.": 'Демо: акаунти зберігаються лише в цьому браузері, доки не буде готовий сервер команди.',
  'This email already has an account': 'Для цього email уже є акаунт',
  'Wrong email or password': 'Неправильний email або пароль',
  Alex: 'Олександр',
  Morgan: 'Коваль',

  // photographer workspace
  'Log in as a photographer to see your bookings and rules.': 'Увійдіть як фотограф, щоб бачити свої бронювання й правила.',
  'Photographer workspace': 'Кабінет фотографа',
  'Bookings & calendar': 'Бронювання й календар',
  'Rules & settings': 'Правила й налаштування',
  'Use a JPG or PNG file': 'Використайте файл JPG або PNG',
  'Could not read the file': 'Не вдалося прочитати файл',
  'Could not read the image': 'Не вдалося прочитати зображення',

  // bookings
  'We could not load your bookings. Try again.': 'Не вдалося завантажити бронювання. Спробуйте ще раз.',
  'Google Calendar connected': 'Google Календар підключено',
  'Demo calendar': 'Демо-календар',
  'Connect Google Calendar': 'Підключити Google Календар',
  'Bookings this week': 'Бронювань цього тижня',
  'Minutes booked': 'Заброньовано хвилин',
  'Deposits received': 'Отримано завдатків',
  'Expected after shoots': 'Очікується після зйомок',
  'Your week': 'Ваш тиждень',
  'Previous week': 'Попередній тиждень',
  'Next week': 'Наступний тиждень',
  'Booking from the service': 'Бронювання з сервісу',
  'Other calendar event': 'Інша подія в календарі',
  'Break after a shoot': 'Перерва після зйомки',
  'Next up': 'Найближчі',
  'Upcoming bookings': 'Майбутні бронювання',
  'No bookings yet. Clients see your free times as soon as your rules are set.': 'Бронювань ще немає. Клієнти побачать ваш вільний час, щойно ви налаштуєте правила.',
  'Set my rules': 'Налаштувати правила',
  'Confirmed, deposit paid': 'Підтверджено, завдаток сплачено',
  'Booking:': 'Бронювання:',
  'Client:': 'Клієнт:',
  'Address:': 'Адреса:',
  'Deposit paid:': 'Завдаток:',
  'Left to pay:': 'Залишок:',
  'Client note:': 'Нотатка клієнта:',

  // rules
  'We could not load your rules. Try again.': 'Не вдалося завантажити правила. Спробуйте ще раз.',
  Walking: 'Пішки',
  'Public transport': 'Громадський транспорт',
  Car: 'Авто',
  'Enter a number': 'Введіть число',
  'At least 15 minutes': 'Щонайменше 15 хвилин',
  'The shortest shoot cannot be longer than the longest shoot': 'Найкоротша зйомка не може бути довшою за найдовшу',
  'The longest shoot cannot be longer than the maximum minutes per day': 'Найдовша зйомка не може бути довшою за денний ліміт хвилин',
  'At least 10 minutes': 'Щонайменше 10 хвилин',
  'At least 100 UAH': 'Щонайменше 100 грн',
  'Choose at least one style': 'Оберіть хоча б один стиль',
  'free start times this week': 'вільних стартів цього тижня',
  'These rules decide which free times clients can book.': 'Ці правила визначають, який час клієнти можуть забронювати.',
  'Timing rules': 'Правила часу',
  'Control your pace and daily workload.': 'Керуйте темпом і денним навантаженням.',
  'Break between shoots': 'Перерва між зйомками',
  'Maximum minutes per day': 'Максимум хвилин на день',
  'Shortest shoot': 'Найкоротша зйомка',
  'Longest shoot': 'Найдовша зйомка',
  'Travel & area': 'Поїздки й район',
  'Clients in areas further away than this do not see you.': 'Клієнти з дальших районів вас не бачитимуть.',
  'Home area': 'Домашній район',
  'Travel distance': 'Як далеко їздите',
  Transport: 'Транспорт',
  'Services & price': 'Послуги й ціна',
  'Choose what you shoot and your price per hour.': 'Оберіть, що знімаєте, і ціну за годину.',
  'Price per hour': 'Ціна за годину',
  'Changes apply to new bookings. The search uses them at once.': 'Зміни діють для нових бронювань. Пошук враховує їх одразу.',
  'Fix the fields marked in red to save.': 'Виправте поля, позначені червоним, щоб зберегти.',
  'Save rules': 'Зберегти правила',
  'Rules saved. New bookings follow them.': 'Правила збережено. Нові бронювання їх враховують.',

  // profile settings
  'We could not load your profile. Try again.': 'Не вдалося завантажити профіль. Спробуйте ще раз.',
  'You can have up to {n} photos': 'Можна додати до {n} фото',
  'Add at least {n} photos': 'Додайте щонайменше {n} фото',
  'Help clients understand your style before they book.': 'Допоможіть клієнтам зрозуміти ваш стиль ще до бронювання.',
  'View my profile': 'Мій профіль',
  'You appear in the search after you save both your profile and your': 'Ви з’явитеся в пошуку, щойно збережете і профіль, і',
  rules: 'правила',
  'Your profile': 'Ваш профіль',
  'The essentials clients see in search.': 'Головне, що клієнти бачать у пошуку.',
  'Change photo': 'Змінити фото',
  'JPG or PNG': 'JPG або PNG',
  'Remove {s}': 'Прибрати {s}',
  'Add skill': 'Додати навичку',
  'One item per line': 'Одна позиція в рядку',
  'Show 3 to 12 photos. Drag to reorder; the first one is the cover.': 'Покажіть від 3 до 12 фото. Перетягуйте, щоб змінити порядок; перше фото — обкладинка.',
  'Remove photo': 'Прибрати фото',
  Cover: 'Обкладинка',
  'Add photos': 'Додати фото',
  '{n} of {max}': '{n} з {max}',
  'Could not save: the photos are too large for browser storage. Remove some photos and try again.':
    'Не вдалося зберегти: фото завеликі для сховища браузера. Приберіть кілька фото й спробуйте ще раз.',
  'Your public profile updates at once.': 'Публічний профіль оновиться одразу.',
  'Save profile': 'Зберегти профіль',
  'Profile saved': 'Профіль збережено',

  // image descriptions
  'Couple during a relaxed photo shoot': 'Пара під час невимушеної фотозйомки',
  'Couple photographed in warm natural light': 'Пара в теплому природному світлі',
  'Family portrait outdoors': 'Сімейний портрет надворі',
  'Photographer at work': 'Фотограф за роботою',
  'Large portfolio view': 'Фото з портфоліо великим планом',
  Profile: 'Профіль',

  // server messages
  'The server is not available. Try again.': 'Сервер недоступний. Спробуйте ще раз.',
  'Log in to continue': 'Увійдіть, щоб продовжити',
  'You cannot change this photographer': 'Ви не можете змінювати цього фотографа',
  'Not your booking': 'Це не ваше бронювання',
  'Booking not found': 'Бронювання не знайдено',
  'Photographer not found': 'Фотографа не знайдено',
  'Rules are not valid': 'Правила заповнено неправильно',
  'Add at least 3 photos': 'Додайте щонайменше 3 фото',
  'Request is too large': 'Запит завеликий',
  'Server error': 'Помилка сервера',

  // matching reasons (spec section 6)
  'Busy: another shoot at this time': 'Зайнято: інша зйомка в цей час',
  'Needs a break after the previous shoot': 'Потрібна перерва після попередньої зйомки',
  'Finishing another shoot across town': 'Завершує іншу зйомку в іншому кінці міста',
  'Fully booked on this day': 'Цей день повністю заброньований',
  'Takes shoots of {min} to {max} minutes': 'Бере зйомки від {min} до {max} хвилин',
  'Does not travel to this area': 'Не їздить у цей район',
  '{n} UAH/h over your budget': 'На {n} грн/год більше за ваш бюджет',
  'Similar style: {has} instead of {wanted}': 'Схожий стиль: «{has}» замість «{wanted}»',
  'Does not shoot this style': 'Не знімає цей стиль',
  'Outside working hours': 'Поза робочим часом',
  'Free from {time}, {shift}': 'Вільно з {time}, {shift}',

  // text pages
  Draft: 'Чернетка',
  'This website is a course demo. No real payments are made and no real photo shoots are arranged.':
    'Цей сайт є навчальним демо. Реальних оплат немає, і реальні фотозйомки не організовуються.',
  'Deposits shown on the site are 30% of the shoot price. The remaining 70% is paid after the shoot.':
    'Завдаток на сайті становить 30% ціни зйомки. Решта 70% сплачується після зйомки.',
  'Cancellation rules: draft. The final text will come from the team (WBS 7.4).': 'Правила скасування: чернетка. Остаточний текст підготує команда (WBS 7.4).',
  'In this demo, accounts and bookings you create are stored only in your own browser. Nothing is sent to a server.':
    'У цьому демо акаунти й бронювання зберігаються лише у вашому браузері. На сервер нічого не надсилається.',
  'You can delete everything with "Reset demo data" in the footer.': 'Усе можна видалити кнопкою «Скинути демо-дані» внизу сторінки.',
  'The final text will come from the team (WBS 7.6).': 'Остаточний текст підготує команда (WBS 7.6).',
}
