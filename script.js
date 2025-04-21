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
    // 아이콘 요소 선택 (HTML 변경에 따라 수정됨 - 변수명은 유지해도 무방)
    const micOffIcon = voiceBtn?.querySelector('.mic-off'); // 슬래시 아이콘
    const micOnIcon = voiceBtn?.querySelector('.mic-on');   // 일반 마이크 아이콘
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
    const lunarHolidays2024 = { "2-9": "설날", "2-10": "설날", "2-11": "설날", "5-14": "부처님오신날", "9-16": "추석", "9-17": "추석", "9-18": "추석" }; // 예시: 2024년 음력 공휴일

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
            return "Invalid Date"; // 오류 발생 시 명확한 문자열 반환
        }
    }

    function toDateOnly(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) {
            console.error("toDateOnly received invalid date:", date);
            return new Date(NaN); // 유효하지 않은 Date 객체 반환
        }
        d.setHours(0, 0, 0, 0); // 시간 부분을 0으로 설정
        return d;
    }

    function findMemoIndexById(id) {
        if (!id) return -1; // ID가 없으면 -1 반환
        return memos.findIndex(memo => memo.id === id);
    }

    function isHoliday(year, month, day) {
        const monthDayKey = `${month + 1}-${day}`;
        if (holidays[monthDayKey]) return holidays[monthDayKey];

        // 음력 공휴일 처리 (현재는 2024년만 예시로 포함)
        // TODO: 실제 음력 계산 로직 구현 필요 (라이브러리 사용 권장)
        if (year === 2024 && lunarHolidays2024[monthDayKey]) {
            return lunarHolidays2024[monthDayKey];
        }
        return null; // 공휴일이 아님
    }

    // --- Calendar Update Functions ---
    function updateMonthDisplay() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthElement.textContent = `${year}년 ${month + 1}월`;
        if (currentYearElement) currentYearElement.textContent = year; // 연도 선택기 연도 업데이트

        // 월 선택기의 월 하이라이트 업데이트
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            item.classList.toggle('selected', monthIndex === month);
        });
    }

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        updateMonthDisplay(); // 달력 상단 연/월 업데이트

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0); // 해당 월의 마지막 날

        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (일) ~ 6 (토)
        const totalDaysInMonth = lastDayOfMonth.getDate(); // 해당 월의 총 일수
        const prevMonthLastDay = new Date(year, month, 0).getDate(); // 이전 달의 마지막 날짜

        calendarDays.innerHTML = ''; // 기존 달력 내용 초기화

        const todayString = toDateOnlyString(new Date()); // 오늘 날짜 문자열 (YYYY-MM-DD)
        const selectedDateString = toDateOnlyString(selectedDate); // 선택된 날짜 문자열

        // 1. 이전 달 날짜 채우기
        for (let i = startingDayOfWeek; i > 0; i--) {
            const day = prevMonthLastDay - i + 1;
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day other-month'; // 이전 달 스타일
            dayElement.textContent = day;
            calendarDays.appendChild(dayElement);
        }

        // 2. 현재 달 날짜 채우기
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day current-month'; // 현재 달 스타일
            dayElement.textContent = day;

            const currentIterationDate = new Date(year, month, day);
            const currentDateString = toDateOnlyString(currentIterationDate);

            // 오늘 날짜 표시
            if (currentDateString === todayString) {
                dayElement.classList.add('today');
            }
            // 선택된 날짜 표시
            if (currentDateString === selectedDateString) {
                dayElement.classList.add('selected');
            }
            // 공휴일 표시
            const holidayName = isHoliday(year, month, day);
            if (holidayName) {
                dayElement.classList.add('holiday');
                dayElement.setAttribute('title', holidayName); // 툴팁으로 공휴일 이름 표시
            }

            // 메모 상태에 따른 배경색 적용
            if (!isNaN(currentIterationDate.getTime())) {
                const iterationDateOnly = toDateOnly(currentIterationDate);
                if (!isNaN(iterationDateOnly.getTime())) {
                    const relevantMemos = memos.filter(memo => {
                        const startDate = toDateOnly(memo.startDate);
                        const endDate = toDateOnly(memo.endDate);
                        // 유효한 날짜이고, 현재 날짜가 메모의 시작일과 종료일 사이에 있는지 확인
                        return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) &&
                               iterationDateOnly >= startDate && iterationDateOnly <= endDate;
                    });

                    const hasMemos = relevantMemos.length > 0;
                    let hasUncompleted = false;
                    let allCompleted = false;

                    if (hasMemos) {
                        dayElement.classList.add('has-memo'); // 메모가 있음을 표시

                        // 완료되지 않은 메모가 하나라도 있는지 확인
                        hasUncompleted = relevantMemos.some(memo => memo.completed === false);

                        // 모든 관련 메모가 완료되었는지 확인 (완료되지 않은 메모가 없을 경우)
                        if (!hasUncompleted) {
                            allCompleted = true;
                        }
                    }

                    // 클래스 적용: 완료되지 않은 메모가 있으면 특정 클래스 추가
                    if (hasUncompleted) {
                        dayElement.classList.add('has-uncompleted-memo');
                    }
                    // 클래스 적용: 모든 메모가 완료되었으면 다른 클래스 추가
                    else if (allCompleted) { // hasUncompleted가 false일 때만 체크
                        dayElement.classList.add('all-memos-completed');
                    }
                }
            }

            // 현재 달 날짜에 클릭 이벤트 추가
            const dateToSelect = new Date(currentIterationDate); // 클로저 문제 방지를 위해 새 Date 객체 생성
            dayElement.addEventListener('click', () => {
                selectedDate = dateToSelect; // 선택된 날짜 업데이트
                updateCalendar(); // 달력 다시 렌더링 (선택 표시 업데이트)
                renderMemos(); // 해당 날짜의 메모 렌더링

                // 현재 활성화된 탭 확인
                const activeTabElement = document.querySelector('.tab.active');
                const activeTabText = activeTabElement ? activeTabElement.textContent : '';

                // 'Active' 또는 'Completed' 탭이 아닐 때만 포커스 이동 (즉, 'All' 탭일 때만)
                if (activeTabText !== 'Active' && activeTabText !== 'Completed') {
                    memoInput?.focus(); // 메모 입력 필드에 포커스
                }
            });

            calendarDays.appendChild(dayElement);
        }

        // 3. 필요한 만큼만 빈 칸 채우기
        const totalCellsFilled = startingDayOfWeek + totalDaysInMonth;
        const requiredRows = Math.ceil(totalCellsFilled / 7);
        const totalCellsRequired = requiredRows * 7;
        const emptyCellsToAdd = totalCellsRequired - totalCellsFilled;

        for (let i = 0; i < emptyCellsToAdd; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day empty-day';
            calendarDays.appendChild(dayElement);
        }

        renderMemos();
    }


    // --- Memo Rendering Function ---
    function renderMemos() {
        // ... (이전과 동일) ...
        // 1. 과거 메모 자동 완료 처리 (종료일 기준)
        const todayDateOnly = toDateOnly(new Date());
        let memosUpdated = false;
        if (!isNaN(todayDateOnly.getTime())) {
            memos.forEach(memo => {
                const relevantDateStr = memo.endDate;
                if (relevantDateStr) {
                    const memoEndDate = new Date(relevantDateStr);
                    if (!isNaN(memoEndDate.getTime())) {
                        const memoEndDateOnly = toDateOnly(memoEndDate);
                        if (!isNaN(memoEndDateOnly.getTime()) && memoEndDateOnly < todayDateOnly && !memo.completed) {
                            memo.completed = true;
                            memosUpdated = true;
                        }
                    }
                }
            });
            if (memosUpdated) {
                localStorage.setItem('memos', JSON.stringify(memos));
                console.log("과거 메모 자동 완료 처리됨.");
            }
        }

        // 2. 탭 기반 필터링
        const activeTab = document.querySelector('.tab.active')?.textContent || 'All';
        let filteredMemos = [];
        const selectedDateOnly = toDateOnly(selectedDate);
        const todayForFilter = toDateOnly(new Date());

        if (activeTab === 'Active') {
            if (!isNaN(selectedDateOnly.getTime())) {
                filteredMemos = memos.filter(memo => {
                    if (memo.completed) return false;
                    const startDate = toDateOnly(memo.startDate);
                    const endDate = toDateOnly(memo.endDate);
                    return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) &&
                           selectedDateOnly >= startDate && selectedDateOnly <= endDate;
                });
            }
        } else if (activeTab === 'Completed') {
            filteredMemos = memos.filter(memo => memo.completed);
        } else if (activeTab === 'All') {
            if (!isNaN(todayForFilter.getTime())) {
                filteredMemos = memos.filter(memo => {
                    const startDate = toDateOnly(memo.startDate);
                    return !isNaN(startDate.getTime()) && startDate >= todayForFilter;
                });
            }
        }

        // 3. 날짜순 정렬
        filteredMemos.sort((a, b) => {
            const dateA = new Date(a.startDate);
            const dateB = new Date(b.startDate);
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB;
        });

        // 4. 메모 목록 DOM 생성 및 렌더링
        memoList.innerHTML = '';
        if (filteredMemos.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            let messageText = '메모가 없습니다.';
            if (activeTab === 'Active') messageText = '선택한 날짜에 진행중인 메모가 없습니다.';
            else if (activeTab === 'Completed') messageText = '완료된 메모가 없습니다.';
            else if (activeTab === 'All') messageText = '예정된 메모가 없습니다.';
            emptyMessage.textContent = messageText;
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
                    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
                    const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

                    if (startDayStr !== endDayStr) {
                        dateDisplayElement = document.createElement('div');
                        dateDisplayElement.className = 'memo-date-range';
                        dateDisplayElement.innerHTML = `<span>${startDate.getDate()}일 ${startTimeStr}</span><span>~</span><span>${endDate.getDate()}일 ${endTimeStr}</span>`;
                    } else {
                        dateDisplayElement = document.createElement('div');
                        dateDisplayElement.className = 'memo-date';
                        dateDisplayElement.textContent = `${startDate.getDate()}일 ${startTimeStr} ~ ${endTimeStr}`;
                    }
                } else {
                    console.warn("toDateOnlyString failed for memo:", memo.id, startDayStr, endDayStr);
                    dateDisplayElement = document.createElement('div');
                    dateDisplayElement.className = 'memo-date error';
                    dateDisplayElement.textContent = '날짜 형식 오류';
                }
            } else {
                console.warn("Invalid Date object for memo:", memo.id, memo.startDate, memo.endDate);
                dateDisplayElement = document.createElement('div');
                dateDisplayElement.className = 'memo-date error';
                dateDisplayElement.textContent = '날짜 데이터 오류';
            }

            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = `memo-checkbox ${memo.completed ? 'checked' : ''}`;
            checkboxDiv.dataset.id = memo.id;

            const contentDiv = document.createElement('div');
            contentDiv.className = `memo-content ${memo.important ? 'important' : ''}`;
            contentDiv.dataset.id = memo.id;
            contentDiv.dataset.content = memo.content;
            contentDiv.textContent = memo.content;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'memo-actions';
            actionsDiv.innerHTML = `
                <button class="star-btn ${memo.important ? 'active' : ''}" data-id="${memo.id}" title="중요 표시/해제">★</button>
                <button class="edit-btn" data-id="${memo.id}" title="메모 수정">✎</button>
                <button class="delete-btn" data-id="${memo.id}" title="메모 삭제">×</button>
            `;

            memoElement.appendChild(checkboxDiv);
            memoElement.appendChild(contentDiv);
            if (dateDisplayElement) {
                memoElement.appendChild(dateDisplayElement);
            }
            memoElement.appendChild(actionsDiv);

            checkboxDiv.addEventListener('click', () => toggleMemoComplete(memo.id));
            actionsDiv.querySelector('.star-btn')?.addEventListener('click', () => toggleMemoImportant(memo.id));
            actionsDiv.querySelector('.edit-btn')?.addEventListener('click', () => editMemo(memo.id));
            actionsDiv.querySelector('.delete-btn')?.addEventListener('click', () => deleteMemo(memo.id));

            memoList.appendChild(memoElement);
        });
    }

    // --- Memo Action Functions (add, toggleComplete, toggleImportant, delete) ---
    // ... (이전과 동일) ...
    function addMemo() {
        const content = memoInput.value.trim();
        if (!content) return;

        const now = new Date();
        const memoDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

        if (isNaN(memoDate.getTime())) {
            alert("유효하지 않은 날짜가 선택되었습니다. 달력에서 날짜를 다시 선택해주세요.");
            return;
        }

        const newMemo = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            content: content,
            completed: false,
            important: false,
            startDate: memoDate.toISOString(),
            endDate: memoDate.toISOString()
        };

        memos.push(newMemo);
        localStorage.setItem('memos', JSON.stringify(memos));
        memoInput.value = '';
        renderMemos();
        updateCalendar();
    }

    function toggleMemoComplete(id) {
        const index = findMemoIndexById(id);
        if (index !== -1) {
            memos[index].completed = !memos[index].completed;
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos();
            updateCalendar();
        }
    }

    function toggleMemoImportant(id) {
        const index = findMemoIndexById(id);
        if (index !== -1) {
            memos[index].important = !memos[index].important;
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos();
        }
    }

    function deleteMemo(id) {
        if (confirm('이 메모를 삭제하시겠습니까?')) {
            const index = findMemoIndexById(id);
            if (index !== -1) {
                memos.splice(index, 1);
                localStorage.setItem('memos', JSON.stringify(memos));
                renderMemos();
                updateCalendar();
            }
        }
    }


    // --- Memo Edit Modal Functions (editMemo, closeModal, saveMemoEdit) ---
    // ... (이전과 동일) ...
    function editMemo(id) {
        const index = findMemoIndexById(id);
        if (index === -1) return;

        editingMemoId = id;
        const memo = memos[index];
        const startDate = new Date(memo.startDate);
        const endDate = new Date(memo.endDate);

        editContent.value = memo.content;

        if (!isNaN(startDate.getTime())) {
            editStartDate.value = toDateOnlyString(startDate);
            editStartTime.value = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
        } else {
            editStartDate.value = '';
            editStartTime.value = '';
        }

        if (!isNaN(endDate.getTime())) {
            editEndDate.value = toDateOnlyString(endDate);
            editEndTime.value = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
        } else {
            editEndDate.value = '';
            editEndTime.value = '';
        }

        editModal.style.display = 'flex';
        editContent.focus();
    }

    function closeModal() {
        editModal.style.display = 'none';
        editingMemoId = null;
    }

    function saveMemoEdit() {
        if (!editingMemoId) return;

        const content = editContent.value.trim();
        if (!content) {
            alert('메모 내용을 입력하세요.');
            return;
        }

        const startDateStr = editStartDate.value;
        const startTimeStr = editStartTime.value || '00:00';
        const endDateStr = editEndDate.value;
        const endTimeStr = editEndTime.value || '23:59';

        if (!startDateStr || !endDateStr) {
            alert('시작 날짜와 종료 날짜를 모두 선택하세요.');
            return;
        }

        const startDate = new Date(`${startDateStr}T${startTimeStr}`);
        const endDate = new Date(`${endDateStr}T${endTimeStr}`);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert('유효하지 않은 날짜 또는 시간 형식입니다. 날짜와 시간을 다시 확인해주세요.');
            return;
        }

        if (endDate < startDate) {
            alert('종료 날짜는 시작 날짜보다 같거나 이후여야 합니다.');
            return;
        }

        const index = findMemoIndexById(editingMemoId);
        if (index !== -1) {
            memos[index] = {
                ...memos[index],
                content: content,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos();
            updateCalendar();
            closeModal();
        } else {
            console.error("저장할 메모를 찾지 못했습니다:", editingMemoId);
            closeModal();
        }
    }

    // --- Tooltip Functions (showTooltip, hideTooltip) ---
    // ... (이전과 동일) ...
    function showTooltip(event) {
        const target = event.target.closest('.memo-content');
        if (target && target.dataset.content) {
            const content = target.dataset.content;
            dynamicTooltip.textContent = content;

            const rect = target.getBoundingClientRect();
            dynamicTooltip.style.display = 'block';

            let top = rect.top - dynamicTooltip.offsetHeight - 5;
            let left = rect.left;

            if (top < 0) {
                top = rect.bottom + 5;
            }

            const vpWidth = window.innerWidth;
            if (left + dynamicTooltip.offsetWidth > vpWidth) {
                left = vpWidth - dynamicTooltip.offsetWidth - 5;
            }
            if (left < 0) {
                left = 5;
            }

            dynamicTooltip.style.top = `${top + window.scrollY}px`;
            dynamicTooltip.style.left = `${left + window.scrollX}px`;
            dynamicTooltip.classList.add('visible');
        }
    }

    function hideTooltip() {
        dynamicTooltip.classList.remove('visible');
    }

    // --- Voice Recognition Functions (updateVoiceButtonState, toggleVoiceRecognition) ---
    // --- 수정된 부분 ---
    function updateVoiceButtonState() {
        if (!voiceBtn) return;
        const isRecording = isRecognizing;
        // CSS가 처리하도록 .recording 클래스만 토글
        voiceBtn.classList.toggle('recording', isRecording);
    }
    // --- 수정 끝 ---

    function toggleVoiceRecognition() {
        if (!recognition) {
            alert('음성 인식이 지원되지 않는 브라우저입니다.');
            return;
        }
        try {
            if (!isRecognizing) {
                recognition.start();
                isRecognizing = true;
            } else {
                recognition.stop();
            }
        } catch (error) {
            console.error("음성 인식 시작/중지 오류:", error);
            isRecognizing = false;
        }
        updateVoiceButtonState();
    }

    // --- Current Time Update ---
    // ... (이전과 동일) ...
    function updateCurrentTime() {
        if (!currentTimeElement) return;
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        currentTimeElement.textContent = formatter.format(now);
    }

    // --- Event Listeners Setup ---
    // ... (이전과 동일) ...
    prevMonthBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    nextMonthBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    monthSelector?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = datePicker.style.display === 'block';
        datePicker.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const year = currentDate.getFullYear();
            if (currentYearElement) currentYearElement.textContent = year;
            monthItems.forEach(item => {
                const monthIndex = parseInt(item.dataset.month);
                item.classList.toggle('selected', monthIndex === currentDate.getMonth());
            });
        }
    });

    monthItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const month = parseInt(item.dataset.month);
            const year = parseInt(currentYearElement.textContent);
            currentDate = new Date(year, month, 1);
            datePicker.style.display = 'none';
            updateCalendar();
        });
    });

    yearPrevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentPickerYear = parseInt(currentYearElement.textContent);
        currentYearElement.textContent = currentPickerYear - 1;
        const currentCalendarMonth = currentDate.getMonth();
        const currentCalendarYear = currentDate.getFullYear();
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            item.classList.toggle('selected', monthIndex === currentCalendarMonth && (currentPickerYear - 1) === currentCalendarYear);
        });
    });

    yearNextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentPickerYear = parseInt(currentYearElement.textContent);
        currentYearElement.textContent = currentPickerYear + 1;
        const currentCalendarMonth = currentDate.getMonth();
        const currentCalendarYear = currentDate.getFullYear();
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            item.classList.toggle('selected', monthIndex === currentCalendarMonth && (currentPickerYear + 1) === currentCalendarYear);
        });
    });

    document.addEventListener('click', (e) => {
        if (datePicker && datePicker.style.display === 'block' && !monthSelector?.contains(e.target) && !datePicker.contains(e.target)) {
            datePicker.style.display = 'none';
        }
    });

    addMemoBtn?.addEventListener('click', addMemo);

    memoInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addMemo();
        }
    });

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMemos();
        });
    });

    saveEditBtn?.addEventListener('click', saveMemoEdit);
    cancelEditBtn?.addEventListener('click', closeModal);
    closeModalBtn?.addEventListener('click', closeModal);
    editModal?.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal?.style.display === 'flex') {
            closeModal();
        }
    });

    if (memoListContainer) {
        memoListContainer.addEventListener('mouseover', showTooltip);
        memoListContainer.addEventListener('mouseout', hideTooltip);
        memoListContainer.addEventListener('scroll', hideTooltip, { passive: true });
    }
    window.addEventListener('resize', hideTooltip, { passive: true });


    // --- Voice Recognition Setup ---
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            if (memoInput) {
                memoInput.value = finalTranscript + interimTranscript;
            }
        };

        recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            if (event.error === 'audio-capture') {
                alert('마이크 접근에 문제가 발생했습니다. 권한을 확인해주세요.');
            } else if (event.error === 'not-allowed') {
                alert('마이크 사용 권한이 거부되었습니다.');
            }
            isRecognizing = false;
            updateVoiceButtonState();
        };

        recognition.onend = () => {
            isRecognizing = false;
            updateVoiceButtonState();
        };

        voiceBtn?.addEventListener('click', toggleVoiceRecognition);

    } else {
        console.warn('음성 인식이 지원되지 않는 브라우저입니다.');
        voiceBtn?.addEventListener('click', () => alert('음성 인식이 지원되지 않는 브라우저입니다.'));
        voiceBtn?.setAttribute('disabled', 'true');

        // 미지원 시 아이콘 처리 (CSS가 기본 상태를 처리하므로 JS 수정 불필요)
        // if (micOffIcon) micOffIcon.style.opacity = '1'; // CSS 기본값
        // if (micOnIcon) micOnIcon.style.opacity = '0';   // CSS 기본값
        if (voiceBtn) voiceBtn.style.cursor = 'not-allowed';
    }

    // --- Initialization ---
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    updateCalendar();
    updateVoiceButtonState(); // 초기 버튼 상태 설정
});
