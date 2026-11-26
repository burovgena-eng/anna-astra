# Anna Astra — сайт астролога «Celestial Atelier» ✶

Люксовый одностраничный сайт для астролога Анны: астрология · таро · руны · психология.

Стек: **чистые HTML/CSS/JS** — без сборщиков и зависимостей проекта. Внешние библиотеки подключаются CDN: **three.js** (3D-сцена), **GSAP + ScrollTrigger** (анимации), **Lenis** (плавный скролл), Google Fonts (кириллические Cormorant Garamond + Manrope).

## Дизайн-концепция

**«Celestial Atelier»** — небесная мастерская: глубокий midnight-фон, шампанское золото, editorial-серифная типографика, ювелирные микро-детали.

| Элемент | Решение |
|---|---|
| Палитра | `#08070F` midnight, `#D8B776/#F2DCA8` champagne gold, `#8C7BE0` starlight violet, ivory `#EFE9DC` |
| Типографика | Cormorant Garamond (дисплей, курсивные акценты с золотым градиентом) + Manrope (UI, разрядка в caps) |
| Фирменные приёмы | corner ticks (угловые риски), hairline-рамки, ✶-орнаменты, зерно плёнки (grain), виньетка |
| 3D | Шейдерное звёздное небо (3 слоя, мерцание), золотая пыль, созвездия, **колесо зодиака** с canvas-текстурой (глифы, круговая латынь «Astra inclinant, non necessitant»), параллакс мыши, привязка к скроллу |
| Motion | Прелоадер со счётчиком и колесом, blur-reveal заголовков, timeline с прорисовкой линии, флип + tilt таро-карт, магнитные кнопки, бегущая строка, кастомный курсор с подписями |
| UX | Клик по таро-карте → переворот; кнопка «Записаться» на обороте подставляет услугу в форму; валидация; success-оверлей; FAQ; слайдер отзывов |

## Исследование (источники)

Прямой просмотр behance.net из среды недоступен (нет браузерного инструмента), поэтому опирался на коллекции, доступные через GitHub, и устоявшуюся картину трендов award-сайтов 2025–2026 (luxury-dark, editorial-серифы, шейдерные 3D-фоны, кинетическая типографика, micro-interactions):

- `bradtraversy/design-resources-for-developers` — раздел Design Inspiration: **Awwwards, Codrops, Land-book, Httpster, Frontend Mentor**
- `gztchan/awesome-design` — курируемая база дизайн-ресурсов
- `adrianhajdin/award-winning-website` — разбор Awwwards Site of the Month (подтверждение стека GSAP)
- `Fullstack-Empire/GSAP-Awwwards-Website` — практика GSAP + ScrollTrigger
- `mrdoob/three.js` — 3D-библиотека
- `darkroomengineering/lenis` — smooth scroll индустриального стандарта
- `motiondivision/motion` (motion.dev) — референс по modern motion API

Вывод из анализа: award-сайты строятся на связке «шейдерный WebGL-фон + GSAP-хореография + инерционный скролл + типографика как главный визуал» — именно это реализовано здесь.

## Структура

```
anna-astra/
├── index.html          # разметка, инлайн-SVG (логотип, эмблема, иконки, фазы луны)
├── css/style.css       # дизайн-система, все стили, адаптив, reduced-motion
├── js/three-scene.js   # WebGL-сцена: звёзды, пыль, созвездия, колесо зодиака
├── js/main.js          # GSAP/Lenis, курсор, карты, форма, FAQ, отзывы
└── README.md
```

## Быстрый старт

Локально: открыть `index.html` в браузере или `python -m http.server 8000` → `http://localhost:8000`.
Лучше через сервер — так корректнее подгружаются шейдеры и шрифты.

### GitHub Pages (бесплатный хостинг)

1. `Settings → Pages`
2. Source: **Deploy from a branch**
3. Branch: **main**, папка **/ (root)** → Save
4. Через 1–2 минуты сайт: `https://burovgena-eng.github.io/anna-astra/`

### Vercel

1. vercel.com → **Add New → Project** → импортировать `anna-astra`
2. Framework Preset: **Other**, Build Command и Output — пустые
3. Deploy

## Замена контента

| Что | Где |
|---|---|
| Контакты | `index.html`, поиск по `anna_astra` и `hello@anna-astra.com` (помечены `<!-- ЗАМЕНИТЕ -->`) |
| Фото Анны | Заменить `<svg class="emblem">…</svg>` в блоке About на: `<img class="pc-photo" src="assets/anna.jpg" alt="Анна — астролог">` (стиль `.pc-photo` уже есть) |
| Приём заявок | `js/main.js`, константа `FORM_ENDPOINT`. Пример: создать форму на [formspree.io](https://formspree.io) и вставить `var FORM_ENDPOINT = 'https://formspree.io/f/XXXXXXXX';` — данные будут уходить на почту. Альтернатива: Telegram-бот (обработчик на любом serverless) |
| Отзывы и тексты | `index.html`, секции `#reviews`, `#about`, `#process`, `#faq` |
| Цвета | `css/style.css`, переменные в `:root` |

## Производительность и доступность

- `prefers-reduced-motion`: отключаются Lenis, курсор, marquee, орбиты; 3D-сцена рендерит один кадр
- Пауза WebGL-рендера при скрытой вкладке; DPR ограничен 2; упрощённые сцены на мобильных
- Семантическая разметка, aria-атрибуты (меню, флип-карты, FAQ, диалог), видимый фокус
- Контент доступен и без JS (`.no-anim`), форма имеет сервер-независимый fallback

## Чек-лист перед публикацией

- [ ] Заменить Telegram/e-mail на реальные
- [ ] Добавить фото Анны (см. выше)
- [ ] Подключить `FORM_ENDPOINT` (Formspree или бот)
- [ ] Заменить демо-отзывы реальными
- [ ] Добавить `og:image` 1200×630 в `<head>`
- [ ] Проверить сайт на телефоне (Chrome DevTools → device toolbar)

---

© 2026 Anna Astra. Дизайн и код — «Celestial Atelier».
