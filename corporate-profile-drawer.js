(() => {
  const profile = {
    firstName: 'Анастасия',
    lastName: 'Смирнова',
    middleName: 'Олеговна',
    noMiddleName: false,
    email: 'anastasia.smirnova@corp.ru',
    phone: '+7 926 234-56-78',
  }

  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  let trigger = null

  function profileFromForm(form) {
    const noMiddleName = form.elements.noMiddleName.checked
    return {
      firstName: form.elements.firstName.value.trim(),
      lastName: form.elements.lastName.value.trim(),
      middleName: noMiddleName ? '' : form.elements.middleName.value.trim(),
      noMiddleName,
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
    }
  }

  function updateSaveState(form) {
    const save = form.closest('.corporate-profile-drawer')?.querySelector('[data-corporate-profile-save]')
    if (!save) return
    const next = profileFromForm(form)
    save.disabled = !Object.keys(profile).some(key => profile[key] !== next[key])
  }

  function close() {
    const layer = document.querySelector('#corporate-profile-layer')
    if (!layer) return
    layer.remove()
    document.body.classList.remove('has-corporate-profile-drawer')
    trigger?.focus?.({ preventScroll: true })
    trigger = null
  }

  function open(nextTrigger) {
    if (document.querySelector('#corporate-profile-layer')) return
    trigger = nextTrigger
    const layer = document.createElement('div')
    layer.className = 'corporate-profile-layer'
    layer.id = 'corporate-profile-layer'
    layer.innerHTML = `
      <section class="corporate-profile-drawer" role="dialog" aria-modal="true" aria-labelledby="corporate-profile-title" tabindex="-1">
        <button class="corporate-profile-drawer__close" type="button" data-corporate-profile-close aria-label="Закрыть">×</button>
        <div class="corporate-profile-drawer__body">
          <div class="corporate-profile-drawer__intro">
            <div><h2 id="corporate-profile-title">Корпоративные тарифы для&nbsp;вас</h2><p>Ваша компания участвует в программе Яндекс Путешествий, поэтому вам доступны специальные цены и скидки</p></div>
            <section class="corporate-profile-perks" aria-label="Корпоративные тарифы">
              <div class="corporate-profile-perks__card">
                <div class="corporate-profile-perks__item"><span><img src="./assets/shared-header/figma-header-discount.svg" alt=""></span><div><strong>Скидки на жильё до 40%</strong><small>Ищите отели и квартиры с пометкой «Корпоративный»</small></div></div>
                <div class="corporate-profile-perks__item"><span><img src="./assets/shared-header/figma-header-briefcase.svg" alt=""></span><div><strong>Поездки в отпуск и по делам</strong><small>Корпоративные скидки действуют, пока работаете в организации</small></div></div>
              </div>
              <button class="corporate-profile-perks__link" type="button">Что это значит?</button>
            </section>
          </div>
          <form id="corporate-profile-form" class="corporate-profile-form">
            <h3>Ваш корпоративный профиль</h3>
            <div class="corporate-profile-form__content">
              <div class="corporate-profile-form__identity">
                <div class="corporate-profile-form__row">
                  <label><span class="corporate-profile-visually-hidden">Имя</span><input name="firstName" value="${escapeHtml(profile.firstName)}" autocomplete="given-name"></label>
                  <label><span class="corporate-profile-visually-hidden">Фамилия</span><input name="lastName" value="${escapeHtml(profile.lastName)}" autocomplete="family-name"></label>
                </div>
                <label><span class="corporate-profile-visually-hidden">Отчество</span><input name="middleName" value="${escapeHtml(profile.middleName)}" autocomplete="additional-name"${profile.noMiddleName ? ' disabled' : ''}></label>
                <label class="corporate-profile-form__switch"><input name="noMiddleName" type="checkbox"${profile.noMiddleName ? ' checked' : ''}><span aria-hidden="true"></span>Нет отчества</label>
              </div>
              <div class="corporate-profile-form__contacts">
                <label><span>Почта для ваучеры и билетов</span><input name="email" type="email" value="${escapeHtml(profile.email)}" autocomplete="email"><small>Отправим ваучеры и билеты на рабочие поездки</small></label>
                <label><span>Телефон</span><input name="phone" type="tel" value="${escapeHtml(profile.phone)}" autocomplete="tel"></label>
              </div>
            </div>
          </form>
        </div>
        <footer class="corporate-profile-drawer__footer"><button type="submit" form="corporate-profile-form" data-corporate-profile-save disabled>Сохранить</button></footer>
      </section>`
    document.body.append(layer)
    document.body.classList.add('has-corporate-profile-drawer')
    layer.querySelector('.corporate-profile-drawer')?.focus({ preventScroll: true })

    const form = layer.querySelector('#corporate-profile-form')
    form.addEventListener('input', () => updateSaveState(form))
    form.addEventListener('change', event => {
      if (event.target.name === 'noMiddleName') form.elements.middleName.disabled = event.target.checked
      updateSaveState(form)
    })
    form.addEventListener('submit', event => {
      event.preventDefault()
      Object.assign(profile, profileFromForm(form))
      updateSaveState(form)
    })
    layer.addEventListener('click', event => {
      if (event.target === layer || event.target.closest('[data-corporate-profile-close]')) close()
    })
  }

  function companyControls() {
    return [...document.querySelectorAll('.account--company, .trip-company')].filter(element => (
      element.textContent.trim().includes('Айди тех')
      && !element.closest('[data-action="company-profile"]')
      && !element.closest('[data-company-profile-bound]')
    ))
  }

  companyControls().forEach(element => {
    const control = element
    if (control.dataset.companyProfileBound !== undefined) return
    control.dataset.companyProfileBound = ''
    if (!control.matches('a, button')) {
      control.setAttribute('role', 'button')
      control.tabIndex = 0
    }
    control.addEventListener('click', event => {
      event.preventDefault()
      event.stopPropagation()
      open(control)
    })
    control.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      open(control)
    })
  })

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.querySelector('#corporate-profile-layer')) {
      event.preventDefault()
      close()
    }
  })
})()
