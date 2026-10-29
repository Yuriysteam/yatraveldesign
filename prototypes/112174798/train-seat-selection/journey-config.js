/* Two-train preview fixtures. Dates, train numbers and prices are demo data.
   Keep this shared by the settings shell, Trip and ticket breakdown. */
window.SeatSelectionJourneys = {
  roundtrip: {
    name: 'Туда и обратно',
    steps: ['Выбор поезда туда', 'Выбор поезда обратно', 'Выбор мест туда', 'Выбор мест обратно', 'Данные пассажиров', 'Подтверждение', 'Оплата'],
    firstSeatStep: 2,
    headings: ['Выберите места туда', 'Выберите места обратно'],
    appTitles: ['Выбор мест туда', 'Выбор мест обратно'],
    backLabel: 'Вернуться к выбору мест туда',
    trains: [
      {
        type: 'sapsan', direction: 'Москва — Санкт-Петербург', name: '754А Сапсан',
        departure: '05:45', arrival: '09:37', duration: '3 ч 52 м',
        departureDate: '18 ноября, ср', arrivalDate: '18 ноября, ср',
        departureStation: 'Ленинградский вкз', arrivalStation: 'Московский вкз',
      },
      {
        type: 'long-distance', direction: 'Санкт-Петербург — Москва', name: '002А Красная стрела',
        departure: '23:55', arrival: '07:55', duration: '8 ч',
        departureDate: '24 ноября, вт', arrivalDate: '25 ноября, ср',
        departureStation: 'Московский вкз', arrivalStation: 'Ленинградский вкз',
      },
    ],
  },
  transfer: {
    name: 'С пересадкой',
    route: 'Москва — Тихвин',
    steps: ['Выбор поезда', 'Выбор мест · Первый поезд', 'Выбор мест · Второй поезд', 'Данные пассажиров', 'Подтверждение', 'Оплата'],
    firstSeatStep: 1,
    headings: ['Выберите места в первом поезде', 'Выберите места во втором поезде'],
    appTitles: ['Выбор мест · Первый поезд', 'Выбор мест · Второй поезд'],
    backLabel: 'Вернуться к выбору мест в первом поезде',
    transfer: 'Пересадка в Санкт-Петербурге со сменой вокзала 1 ч 10 м',
    trains: [
      {
        type: 'long-distance', direction: 'Москва — Санкт-Петербург', name: '016А Арктика',
        departure: '05:30', arrival: '09:35', duration: '4 ч 5 м',
        departureDate: '24 апреля, пт', arrivalDate: '24 апреля, пт',
        departureStation: 'Ленинградский вкз', arrivalStation: 'Московский вкз',
      },
      {
        type: 'long-distance', direction: 'Санкт-Петербург — Тихвин', name: '012А',
        departure: '10:45', arrival: '14:15', duration: '3 ч 30 м',
        departureDate: '24 апреля, пт', arrivalDate: '24 апреля, пт',
        departureStation: 'Ладожский вкз', arrivalStation: 'Тихвин',
      },
    ],
  },
};
