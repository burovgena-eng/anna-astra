# Anna Astra — «Погружение» ✶

Люксовый сайт астролога Анны: астрология · таро · руны.

## Концепция: погружение в шар

Скролл — это не прокрутка страницы, а **полёт камеры**:

1. **Комната гаданий.** Темнота, стол, на нём — стеклянный шар, вокруг карты таро и руны, ползёт туман, горят свечи.
2. **Приближение.** Крутим колесо — камера летит к шару. Внутри шара оживает космос: туманности и звёзды становятся ярче с каждым оборотом.
3. **Пролёт сквозь стекло.** Камера проходит внутрь шара — комната растворяется, и космос становится фоном всего сайта.

Всё построено на **WebGL (three.js)**: настоящие шейдеры туманностей (fbm-шум), стекло с френелевским бликом, процедурные текстуры карт и рун, живой туман и мерцание свечей. Прогресс жёстко привязан к скроллу (`scrub: true`) — **никакой инерции и задержек**, кадр всегда соответствует позиции колеса.

## Что изменилось по фидбеку v1

| Было | Стало |
|---|---|
| Lenis — задержка скролла | Убран полностью. Нативный скролл + pinned-сцена |
| Блюр текста до скролла | Блюр-эффекты удалены из кода целиком |
| Рябящий фон | Зерно статичное (op .04), мерцание звёзд снижено, медленный дрейф туманностей |
| Много текста | Тексты ужаты в 2–3 раза |
| Фейковые отзывы | Секция удалена |
| «Как проходит» | Секция удалена |
| Скролл-анимации фона | Вся сцена управляется скроллом (dive 0→1) |

## Подключение сгенерированных ассетов

Сцена полностью самодостаточна, но поддерживает апгрейд до сгенерированных медиа — **просто положите файлы в папку `assets/`, код менять не нужно**:

### 1. Фон комнаты: `assets/hero-room.jpg`
Заменяет процедурный фон. Получит параллакс за мышью и медленный наезд.

Промпт (Midjourney / Flux / DALL·E):
```
Cinematic dark moody photograph, an ornate glass scrying crystal ball
on an antique wooden table in a pitch-dark room, scattered ornate
tarot cards with gold backs and small engraved rune stones around it,
thin mist creeping over the table, single warm candlelight from the
left, deep shadows, volumetric fog, photorealistic, shallow depth of
field, centered composition, copy space above the ball, muted palette
with warm gold highlights --ar 16:9
```
Спека: **16:9, 2048×1152 или 2400×1350**, без текста и людей.

### 2. Видео космоса: `assets/cosmos.mp4`
После пролёта плавно сменяет процедурный космос (fade на последних 12% dive).

Промпт (Runway / Kling / Luma):
```
Slow cinematic drift through deep space nebula, violet and gold cosmic
clouds, sparse twinkling stars, gentle forward motion, seamless loop,
no planets, no text, dark elegant mood, 4k
```
Спека: **1920×1080, 8–12 сек, бесшовный луп, H.264 MP4 (без звука)**,
вес до ~8 МБ (сожмите через HandBrake, CRF 26).

Файла нет → работает процедурная версия. Файл появился → сайт сам переключается.

## Деплой

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
Адрес: `https://burovgena-eng.github.io/anna-astra/`

**Vercel:** Import repo → Framework: Other → Deploy (без build).

Локально: `python -m http.server 8000` → `http://localhost:8000`.

## Что заменить перед публикацией

- [ ] Контакты: поиск по `anna_astra` и `hello@anna-astra.com` (помечены `<!-- ЗАМЕНИТЕ -->`)
- [ ] Фото Анны: `<img class="pc-photo" src="assets/anna.jpg" alt="Анна">` вместо SVG-эмблемы в About (стиль готов)
- [ ] Форма: `FORM_ENDPOINT` в `js/main.js` (Formspree: `https://formspree.io/f/XXXXXXXX`)
- [ ] При желании — сгенерировать `hero-room.jpg` и `cosmos.mp4` (промпты выше)

## Технические заметки

- three.js r128 (UMD), GSAP + ScrollTrigger, Google Fonts (кириллица). Без сборщиков.
- `prefers-reduced-motion`: сцена рендерит один кадр, pinned-полёт отключён.
- Рендер-пауза при скрытой вкладке; DPR ≤ 1.75; на мобильных меньше тумана и камеры дальше.
- Контент доступен без JS (`no-anim`), форма имеет валидацию и fallback.
