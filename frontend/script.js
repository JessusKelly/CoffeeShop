const API_URL = 'https://coffeeshop-api-s8ft.onrender.com/api';
document.addEventListener('DOMContentLoaded', async () => {
  const dateElement = document.getElementById('date');
  if (dateElement) {
    const options = { day: 'numeric', month: 'long', weekday: 'long' };
    const now = new Date().toLocaleDateString('ru-RU', options);
    dateElement.innerText = now.charAt(0).toUpperCase() + now.slice(1);
  }

  const container = document.getElementById('timelineContainer');
  const nameSelect = document.getElementById('nameInput');
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
    const res = await fetch(`${API_URL}/employees`);
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

    await loadShifts();

  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    container.innerHTML += '<p style="color:red; padding:20px;">Не удалось загрузить данные с сервера. Убедитесь, что бэкенд запущен.</p>';
  }
});
// ЗАГРУЗКА СМЕН ИЗ БАЗЫ
async function loadShifts() {
  try {
    const res = await fetch(`${API_URL}/shifts`);
    if (!res.ok) throw new Error('Ошибка загрузки смен');
    const shifts = await res.json();

    const todayDB = getTodayDBFormat();

    shifts.forEach(shift => {
      if (shift.week_day === todayDB) {
        drawShift(shift);
      }
    });
  } catch (error) {
    console.error('Ошибка при загрузке смен:', error);
  }
}
// ОТРИСОВКА ОДНОЙ СМЕНЫ
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

  bar.onclick = function () {
    deleteShift(shift.id, this);
  };

  timeline.appendChild(bar);
}
// ДОБАВЛЕНИЕ НОВОЙ СМЕНЫ
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

  const weekDay = getTodayDBFormat();
  const startTimeStr = `${start.toString().padStart(2, '0')}:00:00`;
  const endTimeStr = `${end.toString().padStart(2, '0')}:00:00`;

  try {
    const res = await fetch(`${API_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_address_id: userAddressId,
        week_day: weekDay,
        start_time: startTimeStr,
        end_time: endTimeStr
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
// УДАЛЕНИЕ СМЕНЫ
async function deleteShift(shiftId, barElement) {
  if (!confirm('Удалить эту смену?')) return;

  try {
    const res = await fetch(`${API_URL}/shifts/${shiftId}`, {
      method: 'DELETE'
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

function getTodayDBFormat() {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}