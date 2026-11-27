# Anna Astra — «Погружение» ✶

Люксовый сайт астролога Анны: астрология · таро · руны.

## Концепция: погружение в шар

Скролл — это полёт камеры:

1. **Комната гаданий.** Темнота, стол, стеклянный шар, вокруг карты таро и руны, туман, свечи.
2. **Приближение.** Камера летит к шару, внутри оживает космос.
3. **Пролёт сквозь стекло.** Комната растворяется, космос становится фоном сайта.

WebGL (three.js): шейдеры туманностей (fbm), френелевское стекло, процедурные текстуры карт и рун, живой туман. Прогресс жёстко привязан к скроллу (`scrub: true`) — без инерции и задержек.

## Слоты под сгенерированные ассеты

Положите файлы в папку `assets/` — сайт подхватит их автоматически, код менять не нужно:

| Файл | Роль |
|---|---|
| `assets/hero-room.jpg` | Фон комнаты (параллакс + медленный наезд) |
| `assets/cosmos.mp4` | Видео космоса после пролёта (fade на финале dive) |

Файлов нет → работают процедурные версии.

---

## ПРОМПТ-ПАКЕТ (точные промпты под эту сборку)

### ⚠️ Главное правило для `hero-room.jpg`

**В кадре НЕ должно быть шара, карт и рун** — они уже есть в 3D-сцене и будут задваиваться.
Изображение = только атмосфера: комната, туман, свеча, **пустая** столешница.
Наш процедурный шар встанет в центр и будет выглядеть «родным» на этом фоне.

### 1. `hero-room.jpg` — фон комнаты

**Midjourney (v6+):**
```
cinematic dark background plate, empty antique wooden table in a pitch-black
victorian seance room, thin mist rolling low across the tabletop, single warm
candle flame far left casting soft golden light, faint cold violet glow from
the right, deep black shadows, volumetric haze, heavy bokeh, extremely dark
and moody, lots of empty negative space in the upper center, photorealistic,
8k, deep indigo and charcoal palette with warm gold accents
--ar 16:9 --style raw
--no people, hands, face, sphere, crystal ball, tarot cards, runes, stones,
text, letters, watermark, bright light in center
```

**Flux / SDXL:**
```
Prompt: cinematic dark background plate, empty antique wooden table in a
pitch-black room, low mist crawling across the tabletop, single warm candle
flame on the far left, faint violet rim light from the right, deep shadows,
volumetric fog, heavy bokeh, very dark overall, large empty dark area in
upper center, photorealistic, deep indigo charcoal palette, warm gold accents

Negative: people, hands, face, sphere, ball, crystal ball, tarot cards,
runes, stones, text, watermark, logo, bright window, daylight, cluttered,
oversaturated, high contrast center
```
CFG 3.5–5 (Flux), steps 30+, разрешение 1920×1088 или 2048×1152.

**DALL·E 3 / GPT-4o:**
```
A very dark cinematic background: an empty antique wooden table in a
pitch-black Victorian room. Thin mist crawls low across the tabletop. A
single candle flame far to the left casts warm golden light; a faint cold
violet glow comes from the right. Deep shadows, volumetric haze, heavy
bokeh. The upper center of the frame is empty darkness — no objects, no
light spots. Photorealistic, chiaroscuro, deep indigo and charcoal palette
with warm gold accents. No people, no hands, no crystal ball, no cards,
no text.
```

**Русскоязычные сервисы (Kandinsky / Шедеврум):**
```
Кинематографичный очень тёмный фон: пустой антикварный деревянный стол
в кромешно тёмной комнате викторианской эпохи, низкий туман ползёт по
столешнице, слева вдали горит единственная свеча с тёплым золотистым
светом, справа — слабое холодное фиолетовое свечение, глубокие тени,
объёмная дымка в воздухе, сильное боке, верхний центр кадра — пустая
темнота без объектов и света, фотореализм, палитра глубокого индиго и
угля с тёплыми золотыми акцентами. Без людей, рук, шара, сфер, карт,
рун, камней и текста.
```

**Спека:** 16:9, 2400×1350 (минимум 1920×1080), JPEG quality 85, до 1 МБ.

### 2. `cosmos.mp4` — космос после пролёта

Рекомендуемый путь — **image-to-video** (лучше контроль лупа и композиции).

**Шаг А — статичный кадр (Midjourney / Flux):**
```
deep space nebula, vast dark cosmic void, delicate violet and champagne gold
gas clouds, sparse tiny stars, dark dust lanes, soft ethereal glow, very
dark and calm, low contrast, photorealistic astrophotography, 8k
--ar 16:9 --no planets, moon, sun, lens flare, text, bright core, satellite
```

**Шаг Б — анимация (Kling / Runway Gen-3 / Luma):**
```
Extremely slow, almost imperceptible forward drift through the nebula.
Gas clouds subtly swirl, stars gently twinkle. Calm, hypnotic, elegant.
No camera shake, no fast motion, no new objects entering frame.
Seamless loop.
```
Параметры: 1920×1080, 10 секунд, motion strength **low (2–3 из 10)**,
камера — slow zoom-in 3–5%.

**Text-to-video (если без статики):**
```
Slow cinematic forward dolly through a dark deep-space nebula, violet and
champagne gold gas clouds, sparse twinkling stars, very dark, low contrast,
calm and elegant, no planets, no text, no camera shake, seamless loop, 4k
```

**Русский вариант (для Kandinsky Video / Поли):**
```
Очень медленный полёт сквозь тёмную глубокую туманность: нежные фиолетовые
и золотисто-шампанские газовые облака, редкие мерцающие звёзды, очень
темно, низкий контраст, спокойно и элегантно, без планет, текста и
резких движений, бесшовный цикл.
```

**Пост-обработка видео:** HandBrake → H.264, CRF 26, 30 fps, без звука,
Web Optimized (faststart), цель < 8 МБ. Если луп не бесшовный —
crossfade 0.5 с между последним и первым кадром.

### 3. Как загрузить

GitHub → репозиторий → **Add file → Upload files** → перетащить `assets/`
(или создать папку и загрузить файлы) → **Commit changes**.
Через 1–2 минуты сайт сам переключится на сгенерированные медиа.

### 4. Чек-лист проверки сгенерированной картинки

- [ ] Верхний центр — тёмный и чистый (там заголовок и текст)
- [ ] Нет сфер/шаров, карт, рун, лиц, рук, текста
- [ ] Средняя яркость низкая — предметы едва угадываются
- [ ] Туман внизу, у столешницы, а не по всему кадру
- [ ] Наш 3D-шар в центре выглядит на этом фоне «родным»

### 5. Портрет Анны

Только **реальная фотография** — не генерировать. Замена: `<img class="pc-photo"
src="assets/anna.jpg" alt="Анна">` вместо SVG-эмблемы в секции About.

---

## Деплой

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
Адрес: `https://burovgena-eng.github.io/anna-astra/`

**Vercel:** Import repo → Framework: Other → Deploy (без build).
Локально: `python -m http.server 8000`.

## Что заменить перед публикацией

- [ ] Контакты: поиск по `anna_astra` и `hello@anna-astra.com` (помечены `<!-- ЗАМЕНИТЕ -->`)
- [ ] Фото Анны (реальное, см. выше)
- [ ] Форма: `FORM_ENDPOINT` в `js/main.js` (Formspree: `https://formspree.io/f/XXXXXXXX`)
- [ ] При желании — сгенерировать медиа по промпт-пакету выше

## Технические заметки

- three.js r128 (UMD), GSAP + ScrollTrigger, Google Fonts (кириллица). Без сборщиков.
- `prefers-reduced-motion`: один статичный кадр, pinned-полёт отключён.
- Рендер-пауза при скрытой вкладке; DPR ≤ 1.75; на мобильных сцена упрощена.
