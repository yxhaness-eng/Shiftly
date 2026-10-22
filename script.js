(function () {
            const STORAGE_SHIFTS_KEY = 'pink_shifts_data_v2';
            const STORAGE_RATE_KEY = 'pink_shifts_rate_v2';

            const MONTHS_RU = [
                'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
            ];

            const now = new Date();
            let currentYear = now.getFullYear();
            let currentMonth = now.getMonth();

            // Загрузка сохраненных смен (совместима и с ключом первой версии)
            let shifts = loadShifts();
            let shiftRate = localStorage.getItem(STORAGE_RATE_KEY) || localStorage.getItem('pink_calendar_rate_v1') || '';

            const calendarGrid = document.getElementById('calendarGrid');
            const monthYearText = document.getElementById('monthYearText');
            const prevMonthBtn = document.getElementById('prevMonthBtn');
            const nextMonthBtn = document.getElementById('nextMonthBtn');
            const todayBtn = document.getElementById('todayBtn');
            const monthCenterBtn = document.getElementById('monthCenterBtn');
            const clearMonthBtn = document.getElementById('clearMonthBtn');

            const shiftsCountVal = document.getElementById('shiftsCountVal');
            const daysOffCountVal = document.getElementById('daysOffCountVal');
            const totalIncomeVal = document.getElementById('totalIncomeVal');
            const rateInput = document.getElementById('rateInput');

            const clearModal = document.getElementById('clearModal');
            const clearModalDesc = document.getElementById('clearModalDesc');
            const cancelClearBtn = document.getElementById('cancelClearBtn');
            const confirmClearBtn = document.getElementById('confirmClearBtn');

            const exportJsonBtn = document.getElementById('exportJsonBtn');
            const importJsonBtn = document.getElementById('importJsonBtn');
            const importFileInput = document.getElementById('importFileInput');
            const downloadZipBtn = document.getElementById('downloadZipBtn');
            const toastEl = document.getElementById('toastEl');

            function loadShifts() {
                try {
                    const saved = localStorage.getItem(STORAGE_SHIFTS_KEY) || localStorage.getItem('pink_calendar_shifts_v1');
                    return saved ? JSON.parse(saved) : {};
                } catch (e) {
                    return {};
                }
            }

            function saveShifts() {
                try {
                    localStorage.setItem(STORAGE_SHIFTS_KEY, JSON.stringify(shifts));
                } catch (e) {
                    showToast('Не удалось сохранить данные');
                }
            }

            function getDateKey(year, month, day) {
                const m = String(month + 1).padStart(2, '0');
                const d = String(day).padStart(2, '0');
                return `${year}-${m}-${d}`;
            }

            let toastTimer = null;
            function showToast(msg) {
                if (!toastEl) return;
                toastEl.textContent = msg;
                toastEl.classList.add('show');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => {
                    toastEl.classList.remove('show');
                }, 2000);
            }

            // Отрисовка сетки календаря и подсчет статистики
            function renderCalendar() {
                calendarGrid.innerHTML = '';
                monthYearText.textContent = `${MONTHS_RU[currentMonth]} ${currentYear}`;

                const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
                const mondayOffset = (firstDayIndex + 6) % 7;
                const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

                for (let i = 0; i < mondayOffset; i++) {
                    const empty = document.createElement('div');
                    empty.className = 'day-cell empty';
                    calendarGrid.appendChild(empty);
                }

                const todayDate = new Date();
                const isThisMonth = todayDate.getFullYear() === currentYear && todayDate.getMonth() === currentMonth;

                let shiftsCounter = 0;

                for (let day = 1; day <= totalDays; day++) {
                    const key = getDateKey(currentYear, currentMonth, day);
                    const isShift = Boolean(shifts[key]);
                    const isToday = isThisMonth && todayDate.getDate() === day;

                    if (isShift) shiftsCounter++;

                    const cell = document.createElement('div');
                    cell.className = 'day-cell';
                    if (isShift) cell.classList.add('is-shift');
                    if (isToday) cell.classList.add('is-today');

                    const numSpan = document.createElement('span');
                    numSpan.className = 'day-number';
                    numSpan.textContent = day;

                    const statusSpan = document.createElement('span');
                    statusSpan.className = 'day-status';
                    statusSpan.textContent = isShift ? 'Смена' : 'Вых';

                    cell.appendChild(numSpan);
                    cell.appendChild(statusSpan);

                    // Переключение смены строго в 1 нажатие
                    cell.addEventListener('click', () => {
                        if (shifts[key]) {
                            delete shifts[key];
                        } else {
                            shifts[key] = true;
                        }
                        if (navigator.vibrate) {
                            navigator.vibrate(8);
                        }
                        saveShifts();
                        renderCalendar();
                    });

                    calendarGrid.appendChild(cell);
                }

                updateSummary(totalDays, shiftsCounter);
            }

            function updateSummary(totalDays, shiftsCounter) {
                const restDays = totalDays - shiftsCounter;
                const rate = parseFloat(rateInput.value) || 0;
                const income = Math.round(shiftsCounter * rate);

                shiftsCountVal.textContent = shiftsCounter;
                daysOffCountVal.textContent = restDays;
                totalIncomeVal.textContent = income.toLocaleString('ru-RU') + ' ₽';
            }

            function changeMonth(delta) {
                currentMonth += delta;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                } else if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar();
            }

            prevMonthBtn.addEventListener('click', () => changeMonth(-1));
            nextMonthBtn.addEventListener('click', () => changeMonth(1));

            function jumpToToday() {
                const t = new Date();
                currentYear = t.getFullYear();
                currentMonth = t.getMonth();
                renderCalendar();
                showToast('Текущий месяц 🌸');
            }

            todayBtn.addEventListener('click', jumpToToday);
            monthCenterBtn.addEventListener('click', jumpToToday);

            // Поддержка свайпа влево/вправо на экране телефона
            let startX = 0;
            let startY = 0;

            calendarGrid.addEventListener('touchstart', (e) => {
                if (e.changedTouches && e.changedTouches.length > 0) {
                    startX = e.changedTouches[0].screenX;
                    startY = e.changedTouches[0].screenY;
                }
            }, { passive: true });

            calendarGrid.addEventListener('touchend', (e) => {
                if (e.changedTouches && e.changedTouches.length > 0) {
                    const dx = e.changedTouches[0].screenX - startX;
                    const dy = e.changedTouches[0].screenY - startY;
                    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                        changeMonth(dx < 0 ? 1 : -1);
                    }
                }
            }, { passive: true });

            // Ставка за смену
            rateInput.value = shiftRate;
            rateInput.addEventListener('input', () => {
                localStorage.setItem(STORAGE_RATE_KEY, rateInput.value);
                renderCalendar();
            });

            // Очистка текущего месяца
            clearMonthBtn.addEventListener('click', () => {
                clearModalDesc.textContent = `Все отмеченные смены за ${MONTHS_RU[currentMonth]} ${currentYear} будут сняты.`;
                clearModal.classList.add('active');
            });

            cancelClearBtn.addEventListener('click', () => {
                clearModal.classList.remove('active');
            });

            confirmClearBtn.addEventListener('click', () => {
                const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
                for (let d = 1; d <= totalDays; d++) {
                    delete shifts[getDateKey(currentYear, currentMonth, d)];
                }
                saveShifts();
                renderCalendar();
                clearModal.classList.remove('active');
                showToast('Месяц очищен');
            });

            clearModal.addEventListener('click', (e) => {
                if (e.target === clearModal) clearModal.classList.remove('active');
            });

            // Экспорт и импорт JSON
            exportJsonBtn.addEventListener('click', () => {
                const data = {
                    shifts: shifts,
                    rate: rateInput.value,
                    exportedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `shifts-backup-${getDateKey(currentYear, currentMonth, 1)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('База сохранена в файл 💾');
            });

            importJsonBtn.addEventListener('click', () => importFileInput.click());

            importFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        if (parsed && typeof parsed.shifts === 'object') {
                            shifts = parsed.shifts;
                            if (parsed.rate !== undefined) {
                                rateInput.value = parsed.rate;
                                localStorage.setItem(STORAGE_RATE_KEY, parsed.rate);
                            }
                            saveShifts();
                            renderCalendar();
                            showToast('Данные загружены 🌸');
                        } else {
                            showToast('Некорректный файл');
                        }
                    } catch (err) {
                        showToast('Ошибка чтения файла');
                    }
                    importFileInput.value = '';
                };
                reader.readAsText(file);
            });

            // Генерация чистого ZIP-архива для GitHub Pages
            if (downloadZipBtn) {
                downloadZipBtn.addEventListener('click', async () => {
                    if (typeof JSZip === 'undefined') {
                        showToast('Библиотека архивации еще загружается');
                        return;
                    }

                    try {
                        const zip = new JSZip();
                        const cssCode = document.getElementById('app-styles').textContent.trim();
                        const jsCode = document.getElementById('app-script').textContent.trim();

                        const indexHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Мои Смены">
    <meta name="theme-color" content="#fff5f8">
    <title>Календарь рабочих смен</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet">
    <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2224%22 fill=%22%23ff6b9d%22/><text x=%2250%22 y=%2268%22 font-size=%2254%22 text-anchor=%22middle%22>🌸</text></svg>">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="app-shell">
        <main class="card">
            <header class="header-bar">
                <div class="app-title">
                    <div class="logo-badge">🌸</div>
                    <div>
                        <h1>Мои смены</h1>
                        <span>Нажми на день, чтобы отметить смену</span>
                    </div>
                </div>
                <button type="button" class="btn btn-soft" id="todayBtn">Сегодня</button>
            </header>

            <div class="month-controls">
                <button type="button" class="nav-arrow" id="prevMonthBtn" aria-label="Предыдущий месяц">‹</button>
                <div class="month-center" id="monthCenterBtn">
                    <div class="month-label" id="monthYearText">Октябрь 2026</div>
                </div>
                <button type="button" class="nav-arrow" id="nextMonthBtn" aria-label="Следующий месяц">›</button>
            </div>

            <div class="weekdays">
                <div class="weekday">Пн</div>
                <div class="weekday">Вт</div>
                <div class="weekday">Ср</div>
                <div class="weekday">Чт</div>
                <div class="weekday">Пт</div>
                <div class="weekday weekend">Сб</div>
                <div class="weekday weekend">Вс</div>
            </div>

            <div class="calendar-grid" id="calendarGrid"></div>

            <div class="calendar-footer">
                <div class="legend">
                    <div class="legend-item">
                        <span class="legend-dot shift"></span>
                        <span>Смена</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot off"></span>
                        <span>Выходной</span>
                    </div>
                </div>
                <button type="button" class="btn btn-danger" id="clearMonthBtn" style="padding: 6px 12px; font-size: 0.78rem;">
                    Очистить месяц
                </button>
            </div>
        </main>

        <aside class="side-column">
            <section class="card">
                <div class="stats-row">
                    <div class="stat-pill primary">
                        <span class="stat-val" id="shiftsCountVal">0</span>
                        <span class="stat-lbl">Смен</span>
                    </div>
                    <div class="stat-pill">
                        <span class="stat-val" id="daysOffCountVal">0</span>
                        <span class="stat-lbl">Выходных</span>
                    </div>
                    <div class="stat-pill">
                        <span class="stat-val" id="totalIncomeVal">0 ₽</span>
                        <span class="stat-lbl">Доход</span>
                    </div>
                </div>

                <div class="rate-bar">
                    <label for="rateInput">Ставка за смену (₽):</label>
                    <input type="number" id="rateInput" class="rate-input" inputmode="decimal" placeholder="0" min="0" step="100">
                </div>

                <div class="tools-grid">
                    <button type="button" class="btn btn-outline" id="exportJsonBtn">⬇ Сохранить базу</button>
                    <button type="button" class="btn btn-outline" id="importJsonBtn">⬆ Загрузить базу</button>
                </div>
                <input type="file" id="importFileInput" accept=".json" style="display: none;">
            </section>
        </aside>
    </div>

    <div class="modal-overlay" id="clearModal">
        <div class="modal-box">
            <h3>Очистить месяц?</h3>
            <p id="clearModalDesc">Все отмеченные смены в этом месяце будут сброшены.</p>
            <div class="modal-actions">
                <button type="button" class="btn btn-outline" id="cancelClearBtn">Отмена</button>
                <button type="button" class="btn btn-danger" id="confirmClearBtn">Очистить</button>
            </div>
        </div>
    </div>

    <div class="toast" id="toastEl">Сохранено</div>
    <script src="script.js"><\/script>
</body>
</html>`;

                        const readmeMd = `# 🌸 Розовый календарь рабочих смен

Адаптивное веб-приложение на чистом HTML, CSS и Vanilla JavaScript для отметки рабочих смен одним нажатием.

## Как выложить на GitHub Pages
1. Создайте новый репозиторий на GitHub.
2. Загрузите в него файлы из этого архива: \`index.html\`, \`style.css\`, \`script.js\`.
3. Перейдите в **Settings → Pages** и выберите ветку \`main\` (папка \`/root\`).
4. Через минуту ваш календарь будет доступен по ссылке!
`;

                        zip.file('index.html', indexHtml);
                        zip.file('style.css', cssCode);
                        zip.file('script.js', jsCode);
                        zip.file('README.md', readmeMd);

                        const content = await zip.generateAsync({ type: 'blob' });
                        const url = URL.createObjectURL(content);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'pink-shift-calendar.zip';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        showToast('Архив для GitHub Pages скачан! 📦');
                    } catch (err) {
                        showToast('Ошибка при создании архива');
                    }
                });
            }

            renderCalendar();
        })();