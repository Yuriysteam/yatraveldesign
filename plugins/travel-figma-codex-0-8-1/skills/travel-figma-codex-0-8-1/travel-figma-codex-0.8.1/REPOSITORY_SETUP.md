# Настройка общего репозитория

Создайте приватный внутренний Git-репозиторий и используйте versioned release folder как его корень. Включите:

- protected `main`;
- изменения только через PR/MR;
- минимум один review;
- обязательные version validation, `doctor --pack-only` и smoke-tests;
- запрет публичных зеркал и внешних CI без согласования.

Репозиторий содержит `AGENTS.md`, семь skills, installer/bootstrap/doctor/uninstall, contribution rules и integrity manifest. BaseAI runtime и паспорт продукта хранятся и распространяются отдельно.
