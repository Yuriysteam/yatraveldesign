/* Shared by the Store and the HTTPS installation page. */
(function (root) {
  const validId = id => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  const prompt = id => {
    if (!validId(id)) throw new Error('Некорректный идентификатор скилла.');
    return `Если travel-design ещё не подключён в ChatGPT, выполни: codex plugin marketplace add Yuriysteam/yatraveldesign --ref main --sparse .agents/plugins --sparse plugins. Обнови каталог: codex plugin marketplace upgrade travel-design. Затем установи: codex plugin add ${id}@travel-design --json`;
  };
  const deepLink = id => {
    if (!validId(id)) throw new Error('Некорректный идентификатор скилла.');
    return `codex://plugins/install/${encodeURIComponent(id)}?marketplace=travel-design`;
  };
  async function copy(text, button) {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch {
      const field = document.createElement('textarea'); field.value = text;
      field.style.position = 'fixed'; field.style.top = '0'; document.body.append(field); field.select();
      try { copied = document.execCommand('copy'); } catch { copied = false; } finally { field.remove(); }
    }
    const original = button.textContent;
    button.textContent = copied ? 'Промпт скопирован' : 'Не удалось скопировать';
    setTimeout(() => { button.textContent = original; }, 2000);
    return copied;
  }
  root.TravelSkillInstall = { validId, prompt, deepLink, copy };
})(globalThis);
