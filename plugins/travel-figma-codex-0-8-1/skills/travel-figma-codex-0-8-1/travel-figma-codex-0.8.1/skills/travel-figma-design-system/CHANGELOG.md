# Changelog

## 0.2.0 — 2026-10-13

- Добавлен общий readiness gate для Figma ↔ HTML со статусами snapshot/live/coverage вместо общего «дизайн-система подключена».
- Добавлен структурный preflight локальных карт Base 2.0 и Organisms 2.0; live libraries остаются отдельной обязательной проверкой.

## 0.1.1 — 2026-09-07

- Устранено противоречие финального чека Base-карты: разрешены linked components наиболее подходящих утверждённых библиотек, а не только Base. Разделены component instances и token/style bindings. Снимок library inventory не обновлялся.

## 0.1.0 — 2026-09-02

- Создан самостоятельный companion для командной передачи Figma-навыков без зависимости от большого `design` master.
- Вынесены карты Base 2.0 и Organisms 2.0, DS-лестница, provenance gates и правила Extranet/Travel.Styles.
