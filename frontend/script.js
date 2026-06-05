// КОНФИГУРАЦИЯ
const API_URL = 'https://coffeeshop-api-s8ft.onrender.com/api';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
  window.location.href = 'login.html';
}

function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

let currentDate = new Date();

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function formatDateForAPI(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateForDisplay(date) {
  const options = { day: 'numeric', month: 'long', weekday: 'long' };
  const str = date.toLocaleDateString('ru-RU', options);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getDayDBFormat(date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function isToday(date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// НАВИГАЦИЯ ПО ДАТАМ
function changeDate(days) {
  currentDate.setDate(currentDate.getDate() + days);
  loadPageData();
}

function goToToday() {
  currentDate = new Date();
  loadPageData();
}

// ЗАГРУЗКА ДАННЫХ СТРАНИЦЫ
async function loadPageData() {
  const dateElement = document.getElementById('date');
  if (dateElement) {
    dateElement.innerText = formatDateForDisplay(currentDate);
  }

  const container = document.getElementById('timelineContainer');
  const nameSelect = document.getElementById('nameInput');

  container.innerHTML = '';
  const timeMarks = document.createElement('div');
  timeMarks.className = 'time';
  for (let h = 8; h <= 22; h++) {
    const mark = document.createElement('div');
    mark.className = 'hour';
    mark.innerText = h + ':00';
    timeMarks.appendChild(mark);
  }
  container.appendChild(timeMarks);

  try {
    const res = await fetch(`${API_URL}/employees`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Ошибка загрузки сотрудников');
    const employees = await res.json();

    window.userAddressMap = {};

    employees.forEach(person => {
      window.userAddressMap[person.id] = person.user_address_id;

      nameSelect.add(new Option(`${person.surname} ${person.name}`, person.id));

      const row = document.createElement('div');
      row.className = 'worker-row';
      row.innerHTML = `
        <div class="worker-info">
          <strong>${person.surname} ${person.name}</strong><br>
          <small>${person.role_title || 'Сотрудник'}</small>
        </div>
        <div class="timeline" id="timeline-${person.id}"></div>
      `;
      container.appendChild(row);
    });

    await loadShiftsForDate(formatDateForAPI(currentDate));

  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    container.innerHTML += '<p style="color:red; padding:20px;">Не удалось загрузить данные с сервера.</p>';
  }
}

// ЗАГРУЗКА СМЕН НА КОНКРЕТНУЮ ДАТУ
async function loadShiftsForDate(dateStr) {
  try {
    const res = await fetch(`${API_URL}/dates/shifts?date=${dateStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Ошибка загрузки смен');
    const data = await res.json();

    data.shifts.forEach(shift => {
      drawShift(shift);
    });
  } catch (error) {
    console.error('Ошибка при загрузке смен:', error);
  }
}

// ОТРИСОВКА СМЕНЫ
function drawShift(shift) {
  const timeline = document.getElementById(`timeline-${shift.user_id}`);
  if (!timeline) return;

  const start = parseInt(shift.start_time.split(':')[0]);
  const end = parseInt(shift.end_time.split(':')[0]);

  const dayStart = 8;
  const dayDuration = 14;

  const left = ((start - dayStart) / dayDuration) * 100;
  const width = ((end - start) / dayDuration) * 100;

  const bar = document.createElement('div');
  bar.className = 'day';
  bar.style.left = left + '%';
  bar.style.width = width + '%';
  bar.innerText = `${start}:00-${end}:00`;
  bar.dataset.shiftId = shift.id;

    // Обычный клик — редактирование (для админа) или просмотр (для сотрудника)
    bar.onclick = function () {
    if (user && user.role === 1) {
        editShift(shift, this);
    } else {
        alert(`Смена: ${shift.surname} ${shift.name}\nВремя: ${shift.start_time} - ${shift.end_time}\nАдрес: ${shift.address}`);
    }
    };

    // Двойной клик — удаление (только для админа)
    bar.ondblclick = function (e) {
    e.preventDefault(); // Предотвращаем выделение текста
    if (user && user.role === 1) {
        deleteShift(shift.id, this);
    }
    };

  timeline.appendChild(bar);
}

// ДОБАВЛЕНИЕ СМЕНЫ
async function addShift() {
  const userId = document.getElementById('nameInput').value;
  const start = parseInt(document.getElementById('timeStart').value);
  const end = parseInt(document.getElementById('timeEnd').value);

  if (start >= end) {
    alert("Ошибка во времени! Конец должен быть позже начала.");
    return;
  }

  let userAddressId = window.userAddressMap[userId];
  if (userAddressId === undefined) {
    userAddressId = window.userAddressMap[Number(userId)];
  }

  if (!userAddressId) {
    alert("Не удалось найти адрес сотрудника");
    return;
  }

  const weekDay = getDayDBFormat(currentDate);
  const startTimeStr = `${start.toString().padStart(2, '0')}:00:00`;
  const endTimeStr = `${end.toString().padStart(2, '0')}:00:00`;

  try {
    const res = await fetch(`${API_URL}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_address_id: userAddressId,
        week_day: weekDay,
        start_time: startTimeStr,
        end_time: endTimeStr,
        valid_from: formatDateForAPI(currentDate),
        valid_to: formatDateForAPI(currentDate)
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }

    const newShift = await res.json();

    drawShift({
      id: newShift.id,
      user_id: parseInt(userId),
      start_time: startTimeStr,
      end_time: endTimeStr
    });

  } catch (error) {
    console.error('Ошибка при добавлении смены:', error);
    alert('Не удалось сохранить смену: ' + error.message);
  }
}
// РЕДАКТИРОВАНИЕ СМЕНЫ
async function editShift(shift, barElement) {
  const newStart = prompt(`Новое время начала (например, 10):`, parseInt(shift.start_time.split(':')[0]));
  if (newStart === null) return;
  
  const newEnd = prompt(`Новое время конца (например, 18):`, parseInt(shift.end_time.split(':')[0]));
  if (newEnd === null) return;

  const startNum = parseInt(newStart);
  const endNum = parseInt(newEnd);

  if (isNaN(startNum) || isNaN(endNum) || startNum >= endNum) {
    alert('Некорректное время');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/shifts/${shift.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_address_id: window.userAddressMap[shift.user_id],
        week_day: getDayDBFormat(currentDate),
        start_time: `${startNum.toString().padStart(2, '0')}:00:00`,
        end_time: `${endNum.toString().padStart(2, '0')}:00:00`
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }
    loadPageData();

  } catch (error) {
    console.error('Ошибка при редактировании:', error);
    alert('Не удалось изменить смену: ' + error.message);
  }
}

// УДАЛЕНИЕ СМЕНЫ
async function deleteShift(shiftId, barElement) {
  if (!confirm('Удалить эту смену?')) return;

  try {
    const res = await fetch(`${API_URL}/shifts/${shiftId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }

    barElement.remove();

  } catch (error) {
    console.error('Ошибка при удалении смены:', error);
    alert('Не удалось удалить смену: ' + error.message);
  }
}

// СТАТИСТИКА ПО СОТРУДНИКАМ
async function showStats() {
  const modalHtml = `
    <div class="stats-modal-overlay" id="statsModal">
      <div class="stats-modal">
        <h2>Статистика по сотрудникам</h2>
        
        <div class="period-selector">
          <label>Период:</label>
          <select id="statsMonth"></select>
          <select id="statsYear"></select>
          <button onclick="loadStatsForPeriod()">Показать</button>
          <button class="stats-close-btn" onclick="closeStatsModal()" style="background:#666;">Закрыть</button>
        </div>
        
        <div id="statsContent">
          <p style="color:#888;">Выберите период и нажмите "Показать"</p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const monthSelect = document.getElementById('statsMonth');
  const yearSelect = document.getElementById('statsYear');
  
  const months = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  months.forEach((m, i) => {
    const option = document.createElement('option');
    option.value = i + 1;
    option.textContent = m;
    if (i === currentMonth) option.selected = true;
    monthSelect.appendChild(option);
  });

  for (let y = currentYear - 1; y <= currentYear + 1; y++) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    if (y === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }

  await loadStatsForPeriod();
}

async function loadStatsForPeriod() {
  const month = parseInt(document.getElementById('statsMonth').value);
  const year = parseInt(document.getElementById('statsYear').value);
  const contentDiv = document.getElementById('statsContent');

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);

  const fromStr = formatDateForAPI(from);
  const toStr = formatDateForAPI(to);

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  contentDiv.innerHTML = '<p style="color:#888;">Загрузка...</p>';

  try {
    const res = await fetch(`${API_URL}/stats/hours?from=${fromStr}&to=${toStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Ошибка загрузки статистики');
    const stats = await res.json();

    if (stats.length === 0) {
      contentDiv.innerHTML = '<p style="color:#888;">Нет данных за выбранный период</p>';
      return;
    }

    let html = `
      <h3>${monthNames[month - 1]} ${year}</h3>
      <table class="stats-table">
        <thead>
          <tr>
            <th>Сотрудник</th>
            <th>Кол-во смен</th>
            <th>Часов</th>
          </tr>
        </thead>
        <tbody>
    `;

    let totalShifts = 0;
    let totalHours = 0;

    stats.forEach(s => {
      const hours = parseFloat(s.total_hours || 0);
      const shifts = parseInt(s.shifts_count || 0);
      totalShifts += shifts;
      totalHours += hours;

      html += `
        <tr>
          <td>${s.surname} ${s.name}</td>
          <td>${shifts}</td>
          <td>${hours.toFixed(1)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
        <tfoot>
          <tr style="font-weight:bold; background:#f0f0f0;">
            <td>Итого</td>
            <td>${totalShifts}</td>
            <td>${totalHours.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    `;

    contentDiv.innerHTML = html;

  } catch (error) {
    console.error('Ошибка статистики:', error);
    contentDiv.innerHTML = '<p style="color:red;">Не удалось загрузить статистику: ' + error.message + '</p>';
  }
}

function closeStatsModal() {
  const modal = document.getElementById('statsModal');
  if (modal) modal.remove();
}
// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', () => {
  loadPageData();
});