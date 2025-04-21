document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const monthSelector = document.querySelector('.month-selector');
    const datePicker = document.querySelector('.date-picker');
    const currentMonthElement = document.getElementById('currentMonth');
    const currentYearElement = document.querySelector('.current-year');
    const yearPrevBtn = document.querySelector('.year-prev');
    const yearNextBtn = document.querySelector('.year-next');
    const monthItems = document.querySelectorAll('.month-item');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const memoList = document.getElementById('memo-list');
    const addMemoBtn = document.getElementById('add-memo');
    const memoInput = document.getElementById('memo-content');
    const tabs = document.querySelectorAll('.tab');
    const currentTimeElement = document.querySelector('.current-time');
    const voiceBtn = document.getElementById('voice-memo');
    const micOnText = voiceBtn?.querySelector('.mic-on');
    const micOffText = voiceBtn?.querySelector('.mic-off');
    const memoListContainer = document.querySelector('.memo-list');
    const dynamicTooltip = document.getElementById('dynamic-tooltip');
    const editModal = document.querySelector('.edit-modal');
    const editContent = document.getElementById('edit-content');
    const editStartDate = document.getElementById('edit-start-date');
    const editStartTime = document.getElementById('edit-start-time');
    const editEndDate = document.getElementById('edit-end-date');
    const editEndTime = document.getElementById('edit-end-time');
    const saveEditBtn = document.getElementById('save-edit');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const closeModalBtn = document.querySelector('.close-modal');

    // --- State Variables ---
    let currentDate = new Date();
    let selectedDate = new Date();
    let memos = JSON.parse(localStorage.getItem('memos')) || [];
    let recognition = null;
    let isRecognizing = false;
    let editingMemoId = null;

    // --- Constants ---
    const holidays = { "1-1": "신정", "3-1": "삼일절", "5-5": "어린이날", "6-6": "현충일", "8-15": "광복절", "10-3": "개천절", "10-9": "한글날", "12-25": "크리스마스" };
    const lunarHolidays2024 = { "2-9": "설날", "2-10": "설날", "2-11": "설날", "5-14": "부처님오신날", "9-16": "추석", "9-17": "추석", "9-18": "추석" };

    // --- Helper Functions ---
    function toDateOnlyString(date) {
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) throw new Error("Invalid date");
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error("toDateOnlyString error:", error, "Input:", date);
            return "Invalid Date";
        }
    }

    function toDateOnly(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.error("toDateOnly received invalid date:", date);
            return new Date(NaN);
        }
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function findMemoIndexById(id) {
        if (!id) return -1;
        return memos.findIndex(memo => memo.id === id);
    }

    function isHoliday(year, month, day) {
        const monthDayKey = `${month + 1}-${day}`;
        if (holidays[monthDayKey]) return holidays[monthDayKey];
        if (year === 2024 && lunarHolidays2024[monthDayKey]) {
            // TODO: 음력 공휴일 계산 로직 필요
            return lunarHolidays2024[monthDayKey];
        }
        return null;
    }

    // --- Calendar Update Functions ---
    function updateMonthDisplay() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthElement.textContent = `${year}년 ${month + 1}월`;
        if (currentYearElement) currentYearElement.textContent = year;
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            item.classList.toggle('selected', monthIndex === month);
        });
    }

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        updateMonthDisplay();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const startingDayOfWeek = firstDayOfMonth.getDay();
        const totalDaysInMonth = lastDayOfMonth.getDate();
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        calendarDays.innerHTML = '';
        let dayCount = 1;
        let nextMonthDayCount = 1;
        const todayString = toDateOnlyString(new Date());
        const selectedDateString = toDateOnlyString(selectedDate);

        for (let i = 0; i < 42; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            let currentIterationDate;
            let isCurrentMonth = false;
            let day;

            if (i < startingDayOfWeek) {
                day = prevMonthLastDay - (startingDayOfWeek - i - 1);
                dayElement.textContent = day; dayElement.classList.add('other-month');
                currentIterationDate = new Date(year, month - 1, day);
            } else if (dayCount <= totalDaysInMonth) {
                day = dayCount;
                dayElement.textContent = day; isCurrentMonth = true;
                currentIterationDate = new Date(year, month, day);
                const currentDateString = toDateOnlyString(currentIterationDate);
                if (currentDateString === todayString) dayElement.classList.add('today');
                if (currentDateString === selectedDateString) dayElement.classList.add('selected');
                const holidayName = isHoliday(year, month, day);
                if (holidayName) { dayElement.classList.add('holiday'); dayElement.setAttribute('title', holidayName); }
                dayCount++;
            } else {
                day = nextMonthDayCount;
                dayElement.textContent = day; dayElement.classList.add('other-month');
                currentIterationDate = new Date(year, month + 1, day);
                nextMonthDayCount++;
            }

            // *** 메모 완료 상태에 따른 날짜 배경색 변경 로직 수정 ***
            if (isCurrentMonth && currentIterationDate && !isNaN(currentIterationDate.getTime())) {
                 const iterationDateOnly = toDateOnly(currentIterationDate);
                 if (!isNaN(iterationDateOnly.getTime())) {
                     const relevantMemos = memos.filter(memo => {
                         const startDate = toDateOnly(memo.startDate);
                         const endDate = toDateOnly(memo.endDate);
                         return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) &&
                                iterationDateOnly >= startDate && iterationDateOnly <= endDate;
                     });

                     const hasMemos = relevantMemos.length > 0;
                     let hasUncompleted = false;
                     let allCompleted = false;

                     if (hasMemos) {
                         dayElement.classList.add('has-memo'); // 메모 있음 표시

                         // 완료되지 않은 메모가 있는지 확인
                         hasUncompleted = relevantMemos.some(memo => memo.completed === false);

                         // 모든 메모가 완료되었는지 확인 (완료되지 않은 메모가 없을 때)
                         if (!hasUncompleted) {
                             allCompleted = true;
                         }
                     }

                     // 완료되지 않은 메모가 있으면 클래스 추가
                     if (hasUncompleted) {
                         dayElement.classList.add('has-uncompleted-memo');
                     }
                     // 모든 메모가 완료되었으면 클래스 추가
                     else if (allCompleted) { // hasUncompleted가 false일 때만 체크
                         dayElement.classList.add('all-memos-completed');
                     }
                 }
            }
            // *** 로직 수정 끝 ***

            if (isCurrentMonth) {
                const dateToSelect = new Date(currentIterationDate);
                dayElement.addEventListener('click', () => { selectedDate = dateToSelect; updateCalendar(); renderMemos(); memoInput?.focus(); });
            }
            calendarDays.appendChild(dayElement);
        }
        renderMemos();
    }

    // --- Memo Rendering Function ---
    function renderMemos() {
        // 1. 과거 메모 자동 완료 처리
        const todayDateOnly = toDateOnly(new Date());
        let memosUpdated = false;
        if (!isNaN(todayDateOnly.getTime())) {
            memos.forEach(memo => {
                const relevantDateStr = memo.endDate || memo.startDate;
                if (relevantDateStr) {
                    const memoEndDate = new Date(relevantDateStr);
                    if (!isNaN(memoEndDate.getTime())) {
                        const memoEndDateOnly = toDateOnly(memoEndDate);
                        if (!isNaN(memoEndDateOnly.getTime()) && memoEndDateOnly < todayDateOnly && !memo.completed) { memo.completed = true; memosUpdated = true; }
                    }
                }
            });
            if (memosUpdated) { localStorage.setItem('memos', JSON.stringify(memos)); console.log("과거 메모 자동 완료 처리됨."); }
        }

        // 2. 탭 기반 필터링
        const activeTab = document.querySelector('.tab.active')?.textContent || 'All';
        let filteredMemos = [...memos];
        const todayForFilter = toDateOnly(new Date());

        if (activeTab === 'Active') {
            const selectedDateOnly = toDateOnly(selectedDate);
            if (!isNaN(selectedDateOnly.getTime())) {
                filteredMemos = memos.filter(memo => {
                    if (memo.completed) return false;
                    const startDate = toDateOnly(memo.startDate); const endDate = toDateOnly(memo.endDate);
                    return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && selectedDateOnly >= startDate && selectedDateOnly <= endDate;
                });
            } else { filteredMemos = []; }
        } else if (activeTab === 'Completed') {
            filteredMemos = memos.filter(memo => memo.completed);
        } else if (activeTab === 'All') {
            if (!isNaN(todayForFilter.getTime())) {
                filteredMemos = memos.filter(memo => {
                    const startDate = toDateOnly(memo.startDate);
                    return !isNaN(startDate.getTime()) && startDate >= todayForFilter;
                });
            } else { filteredMemos = []; }
        }

        // 3. 날짜순 정렬
        filteredMemos.sort((a, b) => {
            const dateA = new Date(a.startDate); const dateB = new Date(b.startDate);
            if (isNaN(dateA.getTime())) return 1; if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
        });

        // 4. 메모 목록 DOM 생성 및 렌더링
        memoList.innerHTML = '';
        if (filteredMemos.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = activeTab === 'Active' ? '선택한 날짜에 할 일이 없습니다.' : (activeTab === 'Completed' ? '완료된 메모가 없습니다.' : (activeTab === 'All' ? '예정된 메모가 없습니다.' : '메모가 없습니다.'));
            memoList.appendChild(emptyMessage);
            return;
        }

        filteredMemos.forEach((memo) => {
            const memoElement = document.createElement('div');
            memoElement.className = 'memo-item';
            const startDate = new Date(memo.startDate);
            const endDate = new Date(memo.endDate);
            let dateDisplayElement = null;

            const isValidStartDate = !isNaN(startDate.getTime());
            const isValidEndDate = !isNaN(endDate.getTime());

            if (isValidStartDate && isValidEndDate) {
                const startDayStr = toDateOnlyString(startDate);
                const endDayStr = toDateOnlyString(endDate);

                if (startDayStr !== "Invalid Date" && endDayStr !== "Invalid Date") {
                    const startTimeStr = `${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
                    const endTimeStr = `${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}`;

                    if (startDayStr !== endDayStr) {
                        dateDisplayElement = document.createElement('div'); dateDisplayElement.className = 'memo-date-range';
                        dateDisplayElement.innerHTML = `<span>${startDate.getDate()}일 ${startTimeStr}</span><span>~</span><span>${endDate.getDate()}일 ${endTimeStr}</span>`;
                    } else {
                        dateDisplayElement = document.createElement('div'); dateDisplayElement.className = 'memo-date';
                        dateDisplayElement.textContent = `${startDate.getDate()}일 ${startTimeStr}`;
                    }
                } else {
                    console.warn("toDateOnlyString failed for memo:", memo.id, startDayStr, endDayStr);
                    dateDisplayElement = document.createElement('div'); dateDisplayElement.className = 'memo-date error'; dateDisplayElement.textContent = '날짜 형식 오류';
                }
            } else {
                console.warn("Invalid Date object for memo:", memo.id, memo.startDate, memo.endDate);
                dateDisplayElement = document.createElement('div'); dateDisplayElement.className = 'memo-date error'; dateDisplayElement.textContent = '날짜 데이터 오류';
            }

            const checkboxDiv = document.createElement('div'); checkboxDiv.className = `memo-checkbox ${memo.completed ? 'checked' : ''}`; checkboxDiv.dataset.id = memo.id;
            const contentDiv = document.createElement('div'); contentDiv.className = `memo-content ${memo.important ? 'important' : ''}`; contentDiv.dataset.id = memo.id; contentDiv.dataset.content = memo.content; contentDiv.textContent = memo.content;
            const actionsDiv = document.createElement('div'); actionsDiv.className = 'memo-actions'; actionsDiv.innerHTML = `<button class="star-btn ${memo.important ? 'active' : ''}" data-id="${memo.id}">★</button><button class="edit-btn" data-id="${memo.id}">✎</button><button class="delete-btn" data-id="${memo.id}">×</button>`;

            memoElement.appendChild(checkboxDiv); memoElement.appendChild(contentDiv);
            if (dateDisplayElement) { memoElement.appendChild(dateDisplayElement); }
            memoElement.appendChild(actionsDiv);

            checkboxDiv.addEventListener('click', () => toggleMemoComplete(memo.id));
            actionsDiv.querySelector('.star-btn')?.addEventListener('click', () => toggleMemoImportant(memo.id));
            actionsDiv.querySelector('.edit-btn')?.addEventListener('click', () => editMemo(memo.id));
            actionsDiv.querySelector('.delete-btn')?.addEventListener('click', () => deleteMemo(memo.id));

            memoList.appendChild(memoElement);
        });
    }

    // --- Memo Action Functions (add, toggleComplete, toggleImportant, delete) ---
    function addMemo() { const content = memoInput.value.trim(); if (!content) return; const now = new Date(); const memoDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()); if (isNaN(memoDate.getTime())) { alert("유효하지 않은 날짜가 선택되었습니다."); return; } memos.push({ id: Date.now().toString() + Math.random().toString(36).substring(2, 7), content: content, completed: false, important: false, startDate: memoDate.toISOString(), endDate: memoDate.toISOString() }); localStorage.setItem('memos', JSON.stringify(memos)); memoInput.value = ''; renderMemos(); updateCalendar(); }
    function toggleMemoComplete(id) { const index = findMemoIndexById(id); if (index !== -1) { memos[index].completed = !memos[index].completed; localStorage.setItem('memos', JSON.stringify(memos)); renderMemos(); updateCalendar(); } } // updateCalendar 호출 유지
    function toggleMemoImportant(id) { const index = findMemoIndexById(id); if (index !== -1) { memos[index].important = !memos[index].important; localStorage.setItem('memos', JSON.stringify(memos)); renderMemos(); } }
    function deleteMemo(id) { if (confirm('이 메모를 삭제하시겠습니까?')) { const index = findMemoIndexById(id); if (index !== -1) { memos.splice(index, 1); localStorage.setItem('memos', JSON.stringify(memos)); renderMemos(); updateCalendar(); } } }


    // --- Memo Edit Modal Functions (editMemo, closeModal, saveMemoEdit) ---
    function editMemo(id) { const index = findMemoIndexById(id); if (index === -1) return; editingMemoId = id; const memo = memos[index]; const startDate = new Date(memo.startDate); const endDate = new Date(memo.endDate); editContent.value = memo.content; if (!isNaN(startDate.getTime())) { editStartDate.value = toDateOnlyString(startDate); editStartTime.value = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`; } else { editStartDate.value = ''; editStartTime.value = ''; } if (!isNaN(endDate.getTime())) { editEndDate.value = toDateOnlyString(endDate); editEndTime.value = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`; } else { editEndDate.value = ''; editEndTime.value = ''; } editModal.style.display = 'flex'; editContent.focus(); }
    function closeModal() { editModal.style.display = 'none'; editingMemoId = null; }
    function saveMemoEdit() { if (!editingMemoId) return; const content = editContent.value.trim(); if (!content) { alert('메모 내용을 입력하세요.'); return; } const startDateStr = editStartDate.value; const startTimeStr = editStartTime.value || '00:00'; const endDateStr = editEndDate.value; const endTimeStr = editEndTime.value || '23:59'; if (!startDateStr || !endDateStr) { alert('시작 날짜와 종료 날짜를 모두 선택하세요.'); return; } const startDate = new Date(`${startDateStr}T${startTimeStr}`); const endDate = new Date(`${endDateStr}T${endTimeStr}`); if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) { alert('유효하지 않은 날짜 또는 시간 형식입니다. 날짜와 시간을 다시 확인해주세요.'); return; } if (endDate < startDate) { alert('종료 날짜는 시작 날짜보다 같거나 이후여야 합니다.'); return; } const index = findMemoIndexById(editingMemoId); if (index !== -1) { memos[index] = { ...memos[index], content: content, startDate: startDate.toISOString(), endDate: endDate.toISOString() }; localStorage.setItem('memos', JSON.stringify(memos)); renderMemos(); updateCalendar(); closeModal(); } else { console.error("저장할 메모를 찾지 못했습니다:", editingMemoId); closeModal(); } }

    // --- Tooltip Functions (showTooltip, hideTooltip) ---
    function showTooltip(event) { const target = event.target.closest('.memo-content'); if (target && target.dataset.content) { const content = target.dataset.content; dynamicTooltip.textContent = content; const rect = target.getBoundingClientRect(); dynamicTooltip.style.display = 'block'; let top = rect.top - dynamicTooltip.offsetHeight - 5; let left = rect.left; if (top < 0) top = rect.bottom + 5; const vpWidth = window.innerWidth; if (left + dynamicTooltip.offsetWidth > vpWidth) left = vpWidth - dynamicTooltip.offsetWidth - 5; if (left < 0) left = 5; dynamicTooltip.style.top = `${top}px`; dynamicTooltip.style.left = `${left}px`; dynamicTooltip.classList.add('visible'); } }
    function hideTooltip() { dynamicTooltip.classList.remove('visible'); }

    // --- Voice Recognition Functions (updateVoiceButtonState, toggleVoiceRecognition) ---
    function updateVoiceButtonState() { if (!voiceBtn) return; const isRecording = isRecognizing; voiceBtn.classList.toggle('recording', isRecording); if (micOnText) micOnText.style.display = isRecording ? 'block' : 'none'; if (micOffText) micOffText.style.display = isRecording ? 'none' : 'block'; }
    function toggleVoiceRecognition() { if (!recognition) { alert('음성 인식이 지원되지 않는 브라우저입니다.'); return; } try { if (!isRecognizing) { recognition.start(); isRecognizing = true; } else { recognition.stop(); } } catch (error) { console.error("음성 인식 시작/중지 오류:", error); isRecognizing = false; } updateVoiceButtonState(); }

    // --- Current Time Update ---
    function updateCurrentTime() { if (!currentTimeElement) return; const now = new Date(); const formatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }); currentTimeElement.textContent = formatter.format(now); }

    // --- Event Listeners Setup ---
    prevMonthBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentDate.setMonth(currentDate.getMonth() - 1); updateCalendar(); });
    nextMonthBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentDate.setMonth(currentDate.getMonth() + 1); updateCalendar(); });
    monthSelector?.addEventListener('click', (e) => { e.stopPropagation(); const isVisible = datePicker.style.display === 'block'; datePicker.style.display = isVisible ? 'none' : 'block'; if (!isVisible) updateMonthDisplay(); });
    monthItems.forEach(item => { item.addEventListener('click', (e) => { e.stopPropagation(); const month = parseInt(item.dataset.month); currentDate.setMonth(month); datePicker.style.display = 'none'; updateCalendar(); }); });
    yearPrevBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentDate.setFullYear(currentDate.getFullYear() - 1); updateMonthDisplay(); });
    yearNextBtn?.addEventListener('click', (e) => { e.stopPropagation(); currentDate.setFullYear(currentDate.getFullYear() + 1); updateMonthDisplay(); });
    document.addEventListener('click', (e) => { if (datePicker && !monthSelector?.contains(e.target) && !datePicker.contains(e.target)) { datePicker.style.display = 'none'; } });
    addMemoBtn?.addEventListener('click', addMemo);
    memoInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') addMemo(); });
    tabs.forEach(tab => { tab.addEventListener('click', () => { tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); renderMemos(); }); });
    saveEditBtn?.addEventListener('click', saveMemoEdit);
    cancelEditBtn?.addEventListener('click', closeModal);
    closeModalBtn?.addEventListener('click', closeModal);
    editModal?.addEventListener('click', (e) => { if (e.target === editModal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && editModal?.style.display === 'flex') closeModal(); });
    if (memoListContainer) { memoListContainer.addEventListener('mouseover', showTooltip); memoListContainer.addEventListener('mouseout', hideTooltip); memoListContainer.addEventListener('scroll', hideTooltip, { passive: true }); }
    window.addEventListener('resize', hideTooltip, { passive: true });

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition(); recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'ko-KR';
        recognition.onresult = (event) => { let i = event.resultIndex, final = '', interim = ''; while (i < event.results.length) { const transcript = event.results[i][0].transcript; if (event.results[i].isFinal) final += transcript; else interim += transcript; i++; } if (memoInput) memoInput.value = final + interim; };
        recognition.onerror = (event) => { console.error('음성 인식 오류:', event.error); isRecognizing = false; updateVoiceButtonState(); };
        recognition.onend = () => { isRecognizing = false; updateVoiceButtonState(); };
        voiceBtn?.addEventListener('click', toggleVoiceRecognition);
    } else { voiceBtn?.addEventListener('click', () => alert('음성 인식이 지원되지 않는 브라우저입니다.')); voiceBtn?.setAttribute('disabled', 'true'); }

    // --- Initialization ---
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    updateCalendar();
    updateVoiceButtonState();
});
