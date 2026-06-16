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

document.addEventListener('DOMContentLoaded', () => {
  if (user) {
    const userInfo = document.getElementById('currentUser');
    if (userInfo) {
      let fullName;
      if (user.surname && user.name) {
        fullName = `${user.surname} ${user.name}`;
      } else if (user.name) {
        fullName = user.name;
      } else {
        fullName = user.login || 'Пользователь';
      }

      const roleText = user.role === 1 ? '(Админ)' : '(Сотрудник)';
      userInfo.innerText = `${fullName} ${roleText}`;
    }
  }
});

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
  updateDateDisplay();
  reloadShifts();
}

function goToToday() {
  currentDate = new Date();
  updateDateDisplay();
  reloadShifts();
}

function updateDateDisplay() {
  const dateElement = document.getElementById('date');
  if (dateElement) {
    dateElement.innerText = formatDateForDisplay(currentDate);
  }
}

async function reloadShifts() {
  document.querySelectorAll('.timeline').forEach(tl => {
    tl.innerHTML = '';
  });
  await loadShiftsForDate(formatDateForAPI(currentDate));
}

async function loadPageData() {
  updateDateDisplay();
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

    console.log(`Loaded shifts for ${dateStr}:`, data.shifts);

    data.shifts.forEach(shift => {
      console.log('Shift:', shift.id, shift.shift_date, shift.week_day);
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
  bar.dataset.userAddressId = shift.user_address_id;
  bar.dataset.startTime = shift.start_time;
  bar.dataset.endTime = shift.end_time;
  bar.dataset.weekDay = shift.week_day;

  // Клик — показываем окно выбора действия
  bar.onclick = function () {
    if (user && user.role === 1) {
      showShiftActions(shift, this);
    } else {
      alert(`Смена: ${shift.surname} ${shift.name}\nВремя: ${shift.start_time} - ${shift.end_time}\nАдрес: ${shift.address || '—'}`);
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
    alert("Ошибка во времени!");
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

  const shiftDateStr = formatDateForAPI(currentDate);
  const startTimeStr = `${start.toString().padStart(2, '0')}:00:00`;
  const endTimeStr = `${end.toString().padStart(2, '0')}:00:00`;

  console.log('Adding shift:', {
    user_address_id: userAddressId,
    shift_date: shiftDateStr,
    start_time: startTimeStr,
    end_time: endTimeStr
  });

  try {
    const res = await fetch(`${API_URL}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        user_address_id: userAddressId,
        shift_date: shiftDateStr,
        start_time: startTimeStr,
        end_time: endTimeStr
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }

    const newShift = await res.json();
    console.log('Created shift:', newShift);

    drawShift({
      id: newShift.id,
      user_id: parseInt(userId),
      user_address_id: userAddressId,
      shift_date: shiftDateStr,
      start_time: startTimeStr,
      end_time: endTimeStr
    });

  } catch (error) {
    console.error('Ошибка:', error);
    alert('Не удалось сохранить: ' + error.message);
  }
}

// ОКНО ВЫБОРА ДЕЙСТВИЯ ДЛЯ СМЕНЫ
function showShiftActions(shift, barElement) {
  const oldModal = document.getElementById('shiftActionsModal');
  if (oldModal) oldModal.remove();

  const modalHtml = `
    <div id="shiftActionsModal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    " onclick="if(event.target === this) window.closeShiftActionsModal()">
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      ">
        <h3 style="margin-top:0; color:#333;">Смена: ${shift.surname} ${shift.name}</h3>
        <p style="color:#555; margin:8px 0 20px;">
          <strong>Время:</strong> ${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}<br>
          <strong>Адрес:</strong> ${shift.address || '—'}
        </p>
        
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button onclick="window.editFromModal(${shift.id})" style="
            flex: 1;
            padding: 10px 16px;
            background: #4338CA;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Редактировать</button>
          
          <button onclick="window.deleteFromModal(${shift.id})" style="
            flex: 1;
            padding: 10px 16px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Удалить</button>
          
          <button onclick="window.closeShiftActionsModal()" style="
            flex: 1;
            padding: 10px 16px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Отмена</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  window._currentEditShift = shift;
}

function closeShiftActionsModal() {
  const modal = document.getElementById('shiftActionsModal');
  if (modal) modal.remove();
}

function editFromModal(shiftId) {
  closeShiftActionsModal();

  const bar = document.querySelector(`.day[data-shift-id="${shiftId}"]`);

  if (!bar) {
    console.error('Shift element not found');
    return;
  }

  const shiftData = {
    id: parseInt(bar.dataset.shiftId),
    user_address_id: parseInt(bar.dataset.userAddressId),
    start_time: bar.dataset.startTime,
    end_time: bar.dataset.endTime,
    week_day: parseInt(bar.dataset.weekDay)
  };

  console.log('Editing shift from DOM:', shiftData);
  editShift(shiftData, bar);
}

function deleteFromModal(shiftId) {
  closeShiftActionsModal();
  if (confirm('Удалить эту смену?')) {
    deleteShift(shiftId, null);
  }
}

window.showShiftActions = showShiftActions;
window.closeShiftActionsModal = closeShiftActionsModal;
window.editFromModal = editFromModal;
window.deleteFromModal = deleteFromModal;

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
        user_address_id: shift.user_address_id,
        shift_date: formatDateForAPI(currentDate),
        start_time: `${startNum.toString().padStart(2, '0')}:00:00`,
        end_time: `${endNum.toString().padStart(2, '0')}:00:00`
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }

    reloadShifts();

  } catch (error) {
    console.error('Ошибка при редактировании:', error);
    alert('Не удалось изменить смену: ' + error.message);
  }
}

// УДАЛЕНИЕ СМЕНЫ
async function deleteShift(shiftId, barElement) {
  try {
    const res = await fetch(`${API_URL}/shifts/${shiftId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Ошибка сервера');
    }

    if (barElement) {
      barElement.remove();
    } else {
      reloadShifts();
    }

  } catch (error) {
    console.error('Ошибка при удалении смены:', error);
    alert('Не удалось удалить смену: ' + error.message);
  }
}

// СТАТИСТИКА ПО СОТРУДНИКАМ
async function showStats() {
  const oldModal = document.getElementById('statsModal');
  if (oldModal) oldModal.remove();

  const modalHtml = `
    <div id="statsModal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      display: flex;
      justify-content: center;
      align-items: center;
    " onclick="if(event.target === this) window.closeStatsModal()">
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2 style="margin:0; color:#333;">Статистика по сотрудникам</h2>
          <button onclick="window.closeStatsModal()" style="
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0 8px;
          ">×</button>
        </div>
        
        <div style="display:flex; gap:10px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
          <label style="font-weight:600;">Период:</label>
          <select id="statsMonth" style="padding:6px 10px; border:1px solid #ccc; border-radius:6px; font-size:14px;"></select>
          <select id="statsYear" style="padding:6px 10px; border:1px solid #ccc; border-radius:6px; font-size:14px;"></select>
          <button onclick="window.loadStatsForPeriod()" style="
            padding: 6px 14px;
            background: #4338CA;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">Показать</button>
        </div>
        
        <div id="statsContent" style="min-height:100px;">
          <p style="color:#888;">Загрузка...</p>
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
  await window.loadStatsForPeriod();
}

async function loadStatsForPeriod() {
  const monthSelect = document.getElementById('statsMonth');
  const yearSelect = document.getElementById('statsYear');
  const contentDiv = document.getElementById('statsContent');

  if (!monthSelect || !yearSelect || !contentDiv) return;

  const month = parseInt(monthSelect.value);
  const year = parseInt(yearSelect.value);

  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);

  const fromStr = formatDateForAPI(from);
  const toStr = formatDateForAPI(to);

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  contentDiv.innerHTML = '<p style="color:#888; text-align:center;">Загрузка...</p>';

  try {
    const res = await fetch(`${API_URL}/stats/hours?from=${fromStr}&to=${toStr}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Ошибка загрузки статистики');
    const stats = await res.json();

    if (stats.length === 0) {
      contentDiv.innerHTML = '<p style="color:#888; text-align:center;">Нет данных за выбранный период</p>';
      return;
    }

    let html = `
      <h3 style="margin-top:0; color:#333;">${monthNames[month - 1]} ${year}</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #ddd;">Сотрудник</th>
            <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #ddd;">Смен</th>
            <th style="padding:10px 12px; text-align:left; border-bottom:2px solid #ddd;">Часов</th>
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
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:10px 12px;">${s.surname} ${s.name}</td>
          <td style="padding:10px 12px;">${shifts}</td>
          <td style="padding:10px 12px;">${hours.toFixed(1)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
        <tfoot>
          <tr style="font-weight:bold; background:#f0f0f0;">
            <td style="padding:10px 12px;">Итого</td>
            <td style="padding:10px 12px;">${totalShifts}</td>
            <td style="padding:10px 12px;">${totalHours.toFixed(1)}</td>
          </tr>
        </tfoot>
      </table>
    `;

    contentDiv.innerHTML = html;

  } catch (error) {
    console.error('Ошибка статистики:', error);
    contentDiv.innerHTML = '<p style="color:red; text-align:center;">Не удалось загрузить: ' + error.message + '</p>';
  }
}

function closeStatsModal() {
  const modal = document.getElementById('statsModal');
  if (modal) modal.remove();
}

window.showStats = showStats;
window.loadStatsForPeriod = loadStatsForPeriod;
window.closeStatsModal = closeStatsModal;

// ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', () => {
  loadPageData();
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".worker-info").forEach(worker => {
    const nameElement = worker.querySelector(".worker-name") || worker.querySelector("strong");
    const avatarElement = worker.querySelector(".worker-avatar");

    if (nameElement && avatarElement && !avatarElement.querySelector("img")) {
      const nameText = nameElement.textContent.trim();
      const words = nameText.split(/\s+/);

      let initials = "";
      if (words.length >= 2) {
        initials = words[0][0] + words[1][0];
      } else if (words.length === 1 && words[0].length > 0) {
        initials = words[0].substring(0, 2);
      }

      avatarElement.textContent = initials.toUpperCase();
    }
  });

  // --- НАДЕЖНАЯ ЛОГИКА ДРОПДАУНА ---
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDropdown = document.getElementById('settingsDropdown');

  if (settingsBtn && settingsDropdown) {
    settingsBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      settingsDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (event) => {
      if (!settingsBtn.contains(event.target) && !settingsDropdown.contains(event.target)) {
        settingsDropdown.classList.remove('show');
      }
    });
  }

  // Клик на кнопку "Выйти" (синхронизировали ID с вашим HTML)
  const logoutElement = document.getElementById('logout');
  if (logoutElement) {
    logoutElement.addEventListener('click', (event) => {
      event.preventDefault();
      logout();
    });
  }
}); // Финальное закрытие обработчика DOMContentLoaded

// --- КОД АВТО-АВАТАРКИ (ИСПРАВЛЕННЫЙ) ---
const avatarSpan = document.getElementById('currentUser');
if (avatarSpan) {
  const observer = new MutationObserver(() => {
    const nameText = avatarSpan.innerText.trim();
    if (nameText.length > 2) {
      const words = nameText.split(/\s+/);
      if (words.length >= 2) {
        const firstLetter = words[0].charAt(0).toUpperCase();
        const secondLetter = words[1].charAt(0).toUpperCase();
        avatarSpan.innerText = firstLetter + secondLetter;
      } else if (words.length === 1 && words[0].length > 0) {
        avatarSpan.innerText = words[0].substring(0, 2).toUpperCase();
      }
      observer.disconnect();
    }
  });
  observer.observe(avatarSpan, { childList: true, characterData: true, subtree: true });
}
// ----------------------------------------
