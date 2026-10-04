# SAI Universe — MVP vertical slice

Браузерная 3D-игра на Three.js (React Three Fiber). Реализован первый vertical slice из ТЗ:

**Sai Planet → Rio Portal → warp → Rio → Energy Quest → Puzzle → Reward → Rio Apartment → Trophy → следующая глава.**

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit-тесты (квесты, физика, головоломка, паспорт, паркур-маршруты)
npm run build      # typecheck + production build в dist/
```

`?debug` в URL открывает `window.__sai` (store, позиция игрока, телепорт) для QA.

## Что есть в игре

| Экран ТЗ | Где | Что сделано |
|---|---|---|
| 1. Главная планета | `src/game/scenes/HomePlanet.tsx` | Площадь, Sai Core, 5 порталов (Rio открыт, остальные «скоро»), Quest Terminal, Shop, NFT Gallery, Event Portal, Home Portal, Season Board, NPC-гид, платформы для прыжков |
| 2. Выбор портала | `src/ui/panels/PortalPanel.tsx` | Список городов слева, справа арт, страна, описание, прогресс, NFT-статус, награды, ENTER CITY |
| 3. Переход | `src/game/scenes/Warp.tsx` + `TransitionOverlay` в `src/ui/HUD.tsx` | Варп-туннель, Sai летит к городу, прогресс загрузки и подсказки. Пока идёт варп, реально подгружается чанк сцены |
| 4. Rio | `src/game/scenes/RioCity.tsx`, `rioLayout.ts`, `cityKit.ts`, `RioScenery.tsx`, `RioTraffic.tsx` | Копакабана из моделей Kenney: играбельная полоса ~310 м вдоль Авениды Атлантика (фасады, тротуар, проспект с машинами, набережная с волнами), боковые улицы к площади Энергобашни и Carnival Plaza (NFT), станция канатной дороги с парком на холме, апартаменты. Пляж, океан с лодками, холмы с лесом, Корковаду со статуей Христа, Сахарная Голова и Урка — декорации. NPC, орбы, секреты, смотровые точки, fast travel |
| 5. Квест | `src/data/quests.ts`, `src/store/questEngine.ts` | «Energy of Rio»: 3 маяка (простой → паркур по крышам → головоломка), трекер в HUD «2 / 3» |
| 6. Награда | `src/ui/RewardModal.tsx` | Большой экран: энергия, XP, предмет, City Progress, level up, лор |
| 7. Комната | `src/game/scenes/RioRoom.tsx` | Rio Apartment: Quest Terminal, голографическая карта, NFT-галерея, гардероб, полка трофеев, Artifact Station, Portal Device, слоты мебели |
| 8. Quest Terminal | `src/ui/panels/QuestPanels.tsx` | Вкладки Story / Daily / Weekly / Exploration / Events / Residence, ACCEPT / Track |
| 9. Мини-игра | `src/game/puzzle.ts`, `PuzzlePanel.tsx` | «Energy Network» (поворот тайлов). Всегда решаемая (случайное остовное дерево) — для маяка #3 и Artifact Decoding |
| 10. Кастомизация | `WardrobePanel.tsx` | Категории, 3D-превью Sai, 6 скинов на одном «скелете» (меняются только материалы), эмоции, питомцы |
| 11. Транспорт | `Player.tsx` | Hoverboard (F), скорость выше, отдельная поза |
| 12. Паспорт | `CollectionPanels.tsx` | South America, % по городу, условия печати, Community Level |
| 13. Улучшение комнаты | Residence в терминале | Level 1 → 2 → Explorer → Luxury: больше слотов + визуальные апгрейды |
| 14. Карта | `MapPanel.tsx`, `Minimap.tsx` | Мини-карта и карта (M) с зонами, целями квеста, описаниями и fast travel |

Также: инвентарь (I), журнал квестов (Tab), профиль и уровень, Season Pass (free-трек, premium — витрина), магазин (только визуальное, без pay-to-win), питомцы (следуют, телепортируются, подсказывают об орбах), daily-квесты с ежедневным сбросом и daily login бонусом, онбординг-чеклист, мобильное управление (джойстик, прыжок, рывок, взаимодействие, свайп камеры), процедурные звуки и музыка (Home / Rio / Room), графика High/Low.

### Управление
WASD — ходьба · мышь (drag) — камера · колесо — зум · Shift — бег · Space — прыжок / двойной прыжок · Q — рывок · E — взаимодействие · F — hoverboard · M — карта · I — инвентарь · Tab — задания · P — паспорт · C — гардероб · 1–4 — эмоции · Esc — меню.

### Сюжет MVP
1. Rio Technician у портала на набережной выдаёт квест.
2. Маяк #1 — на набережной.
3. Маяк #2 — на крыше через проспект: киоск → остановка → балкон → крыши (двойной прыжок нужен на нескольких шагах).
4. Маяк #3 — у станции канатной дороги, нужна головоломка. После неё весь Rio светится.
5. Награда у техника: +250 энергии, +500 XP, Rio Energy Crystal.
6. Дома кристалл ставится на полку трофеев → открывается глава 2 «Secret on the Mountain»: парящая тропа с крыши станции на вершину, артефакт, расшифровка на Artifact Station → скин Explorer Sai и лор.

### NFT
`src/services/nftAccess.ts`: подключение кошелька (injected wallet или демо-адрес), проверка владения через мок бэкенда, `cityAccess()` → `full / visitor / locked`. Без NFT весь сюжет доступен (visitor access), Rio NFT добавляет Carnival Plaza, скин Rio Sai, NFT-трофей и золотую рамку в галерее. Статов не даёт. В панели NFT Gallery есть «Demo: simulate ownership».

## Архитектура

```
src/
  data/        квесты, предметы, скины, порталы, комната — данные, а не код
  store/       Zustand-store (сохранение в localStorage), quest engine, паспорт
  game/        физика, ввод, контроллер Sai, модели, текстуры, сцены
    scenes/    HomePlanet, RioCity, RioRoom, Warp (лениво грузятся отдельными чанками)
  ui/          HTML/React HUD поверх canvas, панели
  services/    NFT-доступ (мок бэкенда)
  audio/       процедурные SFX и музыка на WebAudio
supabase/schema.sql   таблицы из §52 ТЗ
```

- Одна активная сцена; при переходе старая размонтируется, а R3F освобождает её ресурсы (§56).
- Физика — собственный кинематический контроллер на AABB-коллайдерах (`src/game/physics.ts`): шаги, крыши, стены, коллизия камеры. Тесты проверяют, что паркур-маршруты укладываются в высоту и дальность прыжка.
- Город собран из Kenney City Kit (Commercial, Roads, Suburban), Car Kit, Nature Kit, Watercraft Pack и Mini Characters (CC0). Исходники — в `kenney/`, в игру попадают отобранные и сжатые модели из `public/models/<kit>/`. Дома перекрашены своей палитрой (`public/models/city/Textures/rio-white.png`, `rio-cream.png`). Статичные модели рисуются инстансами (`KitInstances` в `src/game/models/Kit.tsx`): один draw call на модель.
- Квесты описываются данными (`objectives` с типами `reach / activate / puzzle / collect / visit / talk`), движок — чистый reducer, сюжетная логика в коде не захардкожена.

## Отклонения от рекомендованного стека и что дальше

- **Vite вместо Next.js**: игра — один React-компонент `App`, её можно встроить в Next.js-сайт через `dynamic(() => import(...), { ssr: false })`.
- **Своя физика вместо Rapier**: для персонажа и статического города так проще и предсказуемее. Rapier имеет смысл подключить вместе с динамическими объектами.
- **Без GLB**: всё процедурное (примитивы + canvas-текстуры), чтобы MVP был лёгким. Структура готова к `sai.glb` / `rio_*.glb`: процедурные анимации Sai по именам соответствуют состояниям из §4 и меняются на клипы 1:1. Meshopt/Draco/KTX2/LOD — вместе с настоящими ассетами.
- **Без bloom**: postprocessing давал чёрный кадр в части окружений, свечение сделано emissive/additive-материалами.
- **Бэкенд**: прогресс пока в localStorage, NFT-проверка — мок. Схема для Supabase в `supabase/schema.sql`.
- Интерфейс пока на английском (как примеры строк в ТЗ); локализацию RU можно добавить словарём.
