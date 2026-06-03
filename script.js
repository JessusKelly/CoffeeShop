document.addEventListener('DOMContentLoaded', () => {
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

    employees.forEach(person => {
        nameSelect.add(new Option(person.name, person.id));

        const row = document.createElement('div');
        row.className = 'worker-row';
        row.innerHTML = `
            <div class="worker-info">
                <strong>${person.name}</strong><br>
                <small>${person.role}</small>
            </div>
            <div class="timeline" id="timeline-${person.id}"></div>
        `;
        container.appendChild(row);
    });
});

function addShift() {
    const id = document.getElementById('nameInput').value;
    const start = parseInt(document.getElementById('timeStart').value);
    const end = parseInt(document.getElementById('timeEnd').value);

    if (start >= end) {
        alert("Ошибка во времени!");
        return;
    }

    const timeline = document.getElementById(`timeline-${id}`);

    const dayStart = 8;
    const dayDuration = 14;

    const left = ((start - dayStart) / dayDuration) * 100;
    const width = ((end - start) / dayDuration) * 100;

    const bar = document.createElement('div');
    bar.className = 'day';
    bar.style.left = left + '%';
    bar.style.width = width + '%';
    bar.innerText = `${start}:00-${end}:00`;

    bar.onclick = function () { this.remove(); };
    timeline.appendChild(bar);
}
