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
    // 아이콘 요소 선택 (HTML 변경에 따라 수정)
    const micOffIcon = voiceBtn?.querySelector('.mic-off');
    const micOnIcon = voiceBtn?.querySelector('.mic-on');
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

                // --- 수정된 부분 ---
                // 현재 활성화된 탭 확인
                const activeTabElement = document.querySelector('.tab.active');
                const activeTabText = activeTabElement ? activeTabElement.textContent : '';

                // 'Active' 또는 'Completed' 탭이 아닐 때만 포커스 이동 (즉, 'All' 탭일 때만)
                if (activeTabText !== 'Active' && activeTabText !== 'Completed') {
                    memoInput?.focus(); // 메모 입력 필드에 포커스
                }
                // --- 수정 끝 ---
            });

            calendarDays.appendChild(dayElement);
        }

        // 3. 필요한 만큼만 빈 칸 채우기 (수정된 부분)
        const totalCellsFilled = startingDayOfWeek + totalDaysInMonth; // 이전 달 + 현재 달 칸 수
        const requiredRows = Math.ceil(totalCellsFilled / 7); // 필요한 총 주(row) 수
        const totalCellsRequired = requiredRows * 7; // 필요한 총 칸 수
        const emptyCellsToAdd = totalCellsRequired - totalCellsFilled; // 마지막 주를 채우기 위해 필요한 빈 칸 수

        for (let i = 0; i < emptyCellsToAdd; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day empty-day'; // 빈 칸 스타일
            // dayElement.textContent = ''; // 내용은 비움
            calendarDays.appendChild(dayElement);
        }

        // 달력 업데이트 후 메모 목록도 업데이트
        renderMemos();
    }


    // --- Memo Rendering Function ---
    function renderMemos() {
        // 1. 과거 메모 자동 완료 처리 (종료일 기준)
        const todayDateOnly = toDateOnly(new Date());
        let memosUpdated = false;
        if (!isNaN(todayDateOnly.getTime())) {
            memos.forEach(memo => {
                // 종료일(endDate)을 기준으로 확인
                const relevantDateStr = memo.endDate; // startDate 대신 endDate 사용
                if (relevantDateStr) {
                    const memoEndDate = new Date(relevantDateStr);
                    if (!isNaN(memoEndDate.getTime())) {
                        const memoEndDateOnly = toDateOnly(memoEndDate);
                        // 종료 날짜가 오늘보다 이전이고, 아직 완료되지 않았다면 완료 처리
                        if (!isNaN(memoEndDateOnly.getTime()) && memoEndDateOnly < todayDateOnly && !memo.completed) {
                            memo.completed = true;
                            memosUpdated = true;
                        }
                    }
                }
            });
            // 변경사항이 있으면 로컬 스토리지 업데이트
            if (memosUpdated) {
                localStorage.setItem('memos', JSON.stringify(memos));
                console.log("과거 메모 자동 완료 처리됨.");
            }
        }

        // 2. 탭 기반 필터링
        const activeTab = document.querySelector('.tab.active')?.textContent || 'All';
        let filteredMemos = [];
        const selectedDateOnly = toDateOnly(selectedDate); // 선택된 날짜 (시간 제외)
        const todayForFilter = toDateOnly(new Date()); // 오늘 날짜 (시간 제외)

        if (activeTab === 'Active') {
            // 'Active' 탭: 선택된 날짜에 해당하고 완료되지 않은 메모
            if (!isNaN(selectedDateOnly.getTime())) {
                filteredMemos = memos.filter(memo => {
                    if (memo.completed) return false; // 완료된 메모 제외
                    const startDate = toDateOnly(memo.startDate);
                    const endDate = toDateOnly(memo.endDate);
                    // 유효한 날짜 범위 내에 선택된 날짜가 포함되는지 확인
                    return !isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) &&
                           selectedDateOnly >= startDate && selectedDateOnly <= endDate;
                });
            }
        } else if (activeTab === 'Completed') {
            // 'Completed' 탭: 완료된 모든 메모
            filteredMemos = memos.filter(memo => memo.completed);
        } else if (activeTab === 'All') {
            // 'All' 탭: 오늘 또는 미래에 시작하는 모든 메모 (완료 여부 무관)
            if (!isNaN(todayForFilter.getTime())) {
                filteredMemos = memos.filter(memo => {
                    const startDate = toDateOnly(memo.startDate);
                    // 유효한 시작 날짜가 오늘 이후인지 확인
                    return !isNaN(startDate.getTime()) && startDate >= todayForFilter;
                });
            }
        }

        // 3. 날짜순 정렬 (시작 날짜 기준 오름차순)
        filteredMemos.sort((a, b) => {
            const dateA = new Date(a.startDate);
            const dateB = new Date(b.startDate);
            // 유효하지 않은 날짜는 뒤로 보내기
            if (isNaN(dateA.getTime())) return 1;
            if (isNaN(dateB.getTime())) return -1;
            return dateA - dateB; // 날짜 비교
        });

        // 4. 메모 목록 DOM 생성 및 렌더링
        memoList.innerHTML = ''; // 기존 목록 초기화
        if (filteredMemos.length === 0) {
            // 메모가 없을 때 메시지 표시
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            let messageText = '메모가 없습니다.';
            if (activeTab === 'Active') messageText = '선택한 날짜에 진행중인 메모가 없습니다.';
            else if (activeTab === 'Completed') messageText = '완료된 메모가 없습니다.';
            else if (activeTab === 'All') messageText = '예정된 메모가 없습니다.';
            emptyMessage.textContent = messageText;
            memoList.appendChild(emptyMessage);
            return; // 함수 종료
        }

        // 필터링 및 정렬된 메모를 순회하며 DOM 요소 생성
        filteredMemos.forEach((memo) => {
            const memoElement = document.createElement('div');
            memoElement.className = 'memo-item';
            const startDate = new Date(memo.startDate);
            const endDate = new Date(memo.endDate);
            let dateDisplayElement = null; // 날짜 표시용 요소

            const isValidStartDate = !isNaN(startDate.getTime());
            const isValidEndDate = !isNaN(endDate.getTime());

            // 시작일과 종료일이 모두 유효할 때만 날짜 표시
            if (isValidStartDate && isValidEndDate) {
                const startDayStr = toDateOnlyString(startDate);
                const endDayStr = toDateOnlyString(endDate);

                // 날짜 문자열 변환이 성공했을 때
                if (startDayStr !== "Invalid Date" && endDayStr !== "Invalid Date") {
                    const startTimeStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
                    const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

                    // 시작일과 종료일이 다를 경우 범위로 표시
                    if (startDayStr !== endDayStr) {
                        dateDisplayElement = document.createElement('div');
                        dateDisplayElement.className = 'memo-date-range';
                        // 날짜와 시간 함께 표시
                        dateDisplayElement.innerHTML = `<span>${startDate.getDate()}일 ${startTimeStr}</span><span>~</span><span>${endDate.getDate()}일 ${endTimeStr}</span>`;
                    }
                    // 시작일과 종료일이 같을 경우 시작 시간만 표시 (또는 필요에 따라 범위 표시)
                    else {
                        dateDisplayElement = document.createElement('div');
                        dateDisplayElement.className = 'memo-date';
                        // 예: 15일 09:00 ~ 18:00 형태로 표시
                        dateDisplayElement.textContent = `${startDate.getDate()}일 ${startTimeStr} ~ ${endTimeStr}`;
                        // 만약 시작 시간만 표시하고 싶다면:
                        // dateDisplayElement.textContent = `${startDate.getDate()}일 ${startTimeStr}`;
                    }
                } else {
                    // 날짜 문자열 변환 실패 시 오류 메시지
                    console.warn("toDateOnlyString failed for memo:", memo.id, startDayStr, endDayStr);
                    dateDisplayElement = document.createElement('div');
                    dateDisplayElement.className = 'memo-date error';
                    dateDisplayElement.textContent = '날짜 형식 오류';
                }
            } else {
                // Date 객체 자체가 유효하지 않을 경우 오류 메시지
                console.warn("Invalid Date object for memo:", memo.id, memo.startDate, memo.endDate);
                dateDisplayElement = document.createElement('div');
                dateDisplayElement.className = 'memo-date error';
                dateDisplayElement.textContent = '날짜 데이터 오류';
            }

            // 체크박스 요소 생성
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = `memo-checkbox ${memo.completed ? 'checked' : ''}`;
            checkboxDiv.dataset.id = memo.id; // 데이터 속성에 ID 저장

            // 메모 내용 요소 생성
            const contentDiv = document.createElement('div');
            contentDiv.className = `memo-content ${memo.important ? 'important' : ''}`;
            contentDiv.dataset.id = memo.id;
            contentDiv.dataset.content = memo.content; // 툴팁용 데이터 속성
            contentDiv.textContent = memo.content; // 실제 내용 표시

            // 액션 버튼 (중요, 수정, 삭제) 요소 생성
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'memo-actions';
            actionsDiv.innerHTML = `
                <button class="star-btn ${memo.important ? 'active' : ''}" data-id="${memo.id}" title="중요 표시/해제">★</button>
                <button class="edit-btn" data-id="${memo.id}" title="메모 수정">✎</button>
                <button class="delete-btn" data-id="${memo.id}" title="메모 삭제">×</button>
            `;

            // 생성된 요소들을 memoElement에 추가
            memoElement.appendChild(checkboxDiv);
            memoElement.appendChild(contentDiv);
            if (dateDisplayElement) { // 날짜 표시 요소가 생성되었으면 추가
                memoElement.appendChild(dateDisplayElement);
            }
            memoElement.appendChild(actionsDiv);

            // 각 버튼 및 요소에 이벤트 리스너 추가
            checkboxDiv.addEventListener('click', () => toggleMemoComplete(memo.id));
            actionsDiv.querySelector('.star-btn')?.addEventListener('click', () => toggleMemoImportant(memo.id));
            actionsDiv.querySelector('.edit-btn')?.addEventListener('click', () => editMemo(memo.id));
            actionsDiv.querySelector('.delete-btn')?.addEventListener('click', () => deleteMemo(memo.id));

            // 완성된 메모 아이템을 목록에 추가
            memoList.appendChild(memoElement);
        });
    }

    // --- Memo Action Functions (add, toggleComplete, toggleImportant, delete) ---
    function addMemo() {
        const content = memoInput.value.trim();
        if (!content) return; // 내용 없으면 중단

        const now = new Date(); // 현재 시간
        // 선택된 날짜에 현재 시간을 적용하여 메모의 기본 시작/종료 시간 설정
        const memoDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

        if (isNaN(memoDate.getTime())) {
            alert("유효하지 않은 날짜가 선택되었습니다. 달력에서 날짜를 다시 선택해주세요.");
            return;
        }

        // 새 메모 객체 생성 (시작일과 종료일을 동일하게 설정)
        const newMemo = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // 고유 ID 생성
            content: content,
            completed: false,
            important: false,
            startDate: memoDate.toISOString(), // ISO 문자열로 저장
            endDate: memoDate.toISOString()    // ISO 문자열로 저장
        };

        memos.push(newMemo); // 메모 배열에 추가
        localStorage.setItem('memos', JSON.stringify(memos)); // 로컬 스토리지 저장
        memoInput.value = ''; // 입력 필드 초기화
        renderMemos(); // 메모 목록 다시 렌더링
        updateCalendar(); // 달력 업데이트 (메모 유무 표시 등)
    }

    function toggleMemoComplete(id) {
        const index = findMemoIndexById(id);
        if (index !== -1) {
            memos[index].completed = !memos[index].completed; // 완료 상태 토글
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos(); // 메모 목록 업데이트
            updateCalendar(); // 달력 업데이트 (완료 상태 반영)
        }
    }

    function toggleMemoImportant(id) {
        const index = findMemoIndexById(id);
        if (index !== -1) {
            memos[index].important = !memos[index].important; // 중요 상태 토글
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos(); // 메모 목록 업데이트 (중요 표시 반영)
            // 중요도 변경은 달력 표시에 직접적인 영향 없으므로 updateCalendar() 호출 불필요
        }
    }

    function deleteMemo(id) {
        if (confirm('이 메모를 삭제하시겠습니까?')) { // 사용자 확인
            const index = findMemoIndexById(id);
            if (index !== -1) {
                memos.splice(index, 1); // 배열에서 메모 제거
                localStorage.setItem('memos', JSON.stringify(memos));
                renderMemos(); // 메모 목록 업데이트
                updateCalendar(); // 달력 업데이트 (메모 유무 반영)
            }
        }
    }


    // --- Memo Edit Modal Functions (editMemo, closeModal, saveMemoEdit) ---
    function editMemo(id) {
        const index = findMemoIndexById(id);
        if (index === -1) return; // 해당 ID의 메모가 없으면 중단

        editingMemoId = id; // 현재 수정 중인 메모 ID 저장
        const memo = memos[index];
        const startDate = new Date(memo.startDate);
        const endDate = new Date(memo.endDate);

        // 모달 필드에 기존 메모 정보 채우기
        editContent.value = memo.content;

        // 시작 날짜 및 시간 설정
        if (!isNaN(startDate.getTime())) {
            editStartDate.value = toDateOnlyString(startDate); // YYYY-MM-DD 형식
            editStartTime.value = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`; // HH:MM 형식
        } else {
            editStartDate.value = ''; // 유효하지 않으면 비움
            editStartTime.value = '';
        }

        // 종료 날짜 및 시간 설정
        if (!isNaN(endDate.getTime())) {
            editEndDate.value = toDateOnlyString(endDate); // YYYY-MM-DD 형식
            editEndTime.value = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`; // HH:MM 형식
        } else {
            editEndDate.value = ''; // 유효하지 않으면 비움
            editEndTime.value = '';
        }

        editModal.style.display = 'flex'; // 모달 표시
        editContent.focus(); // 내용 입력 필드에 포커스
    }

    function closeModal() {
        editModal.style.display = 'none'; // 모달 숨기기
        editingMemoId = null; // 수정 중인 메모 ID 초기화
    }

    function saveMemoEdit() {
        if (!editingMemoId) return; // 수정 중인 메모 ID 없으면 중단

        const content = editContent.value.trim();
        if (!content) {
            alert('메모 내용을 입력하세요.');
            return;
        }

        const startDateStr = editStartDate.value;
        const startTimeStr = editStartTime.value || '00:00'; // 시간 입력 없으면 00:00
        const endDateStr = editEndDate.value;
        const endTimeStr = editEndTime.value || '23:59'; // 시간 입력 없으면 23:59

        if (!startDateStr || !endDateStr) {
            alert('시작 날짜와 종료 날짜를 모두 선택하세요.');
            return;
        }

        // 입력된 날짜와 시간으로 Date 객체 생성
        const startDate = new Date(`${startDateStr}T${startTimeStr}`);
        const endDate = new Date(`${endDateStr}T${endTimeStr}`);

        // 생성된 Date 객체가 유효한지 확인
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert('유효하지 않은 날짜 또는 시간 형식입니다. 날짜와 시간을 다시 확인해주세요.');
            return;
        }

        // 종료 날짜가 시작 날짜보다 이전인지 확인
        if (endDate < startDate) {
            alert('종료 날짜는 시작 날짜보다 같거나 이후여야 합니다.');
            return;
        }

        const index = findMemoIndexById(editingMemoId);
        if (index !== -1) {
            // 기존 메모 객체를 업데이트 (불변성 유지하며 업데이트 권장)
            memos[index] = {
                ...memos[index], // 기존 속성 복사
                content: content,
                startDate: startDate.toISOString(), // ISO 문자열로 저장
                endDate: endDate.toISOString()      // ISO 문자열로 저장
            };
            localStorage.setItem('memos', JSON.stringify(memos)); // 로컬 스토리지 저장
            renderMemos(); // 메모 목록 업데이트
            updateCalendar(); // 달력 업데이트
            closeModal(); // 모달 닫기
        } else {
            // 이론적으로 발생하기 어렵지만, 방어 코드
            console.error("저장할 메모를 찾지 못했습니다:", editingMemoId);
            closeModal(); // 오류 발생해도 모달은 닫기
        }
    }

    // --- Tooltip Functions (showTooltip, hideTooltip) ---
    function showTooltip(event) {
        // 이벤트 대상이 '.memo-content' 또는 그 자식인지 확인
        const target = event.target.closest('.memo-content');
        if (target && target.dataset.content) { // 대상과 내용 데이터가 있는지 확인
            const content = target.dataset.content;
            dynamicTooltip.textContent = content; // 툴팁 내용 설정

            const rect = target.getBoundingClientRect(); // 대상 요소의 위치와 크기 정보
            dynamicTooltip.style.display = 'block'; // 툴팁 표시 (위치 계산 전에 필요)

            // 툴팁 위치 계산
            let top = rect.top - dynamicTooltip.offsetHeight - 5; // 기본 위치: 요소 위쪽 5px
            let left = rect.left; // 기본 위치: 요소 왼쪽 정렬

            // 툴팁이 화면 상단 밖으로 나갈 경우 요소 아래쪽에 표시
            if (top < 0) {
                top = rect.bottom + 5;
            }

            // 툴팁이 화면 오른쪽 밖으로 나갈 경우 위치 조정
            const vpWidth = window.innerWidth;
            if (left + dynamicTooltip.offsetWidth > vpWidth) {
                left = vpWidth - dynamicTooltip.offsetWidth - 5; // 오른쪽 끝에서 5px 안쪽
            }
            // 툴팁이 화면 왼쪽 밖으로 나갈 경우 위치 조정
            if (left < 0) {
                left = 5; // 왼쪽 끝에서 5px 안쪽
            }

            // 계산된 위치 적용
            dynamicTooltip.style.top = `${top + window.scrollY}px`; // 스크롤 위치 고려
            dynamicTooltip.style.left = `${left + window.scrollX}px`; // 스크롤 위치 고려
            dynamicTooltip.classList.add('visible'); // 툴팁을 보이게 하는 클래스 추가 (애니메이션 등)
        }
    }

    function hideTooltip() {
        dynamicTooltip.classList.remove('visible'); // 툴팁 숨김 클래스 제거
        // display: none은 약간의 지연 후 처리하거나 CSS transition end 이벤트 활용 가능
        // dynamicTooltip.style.display = 'none';
    }

    // --- Voice Recognition Functions (updateVoiceButtonState, toggleVoiceRecognition) ---
    function updateVoiceButtonState() {
        if (!voiceBtn) return; // 음성 버튼 없으면 중단
        const isRecording = isRecognizing; // 현재 인식 중 상태
        voiceBtn.classList.toggle('recording', isRecording); // 'recording' 클래스 토글

        // 마이크 아이콘 표시 상태 업데이트 (HTML 변경에 따라 수정)
        if (micOnIcon) micOnIcon.style.opacity = isRecording ? '1' : '0'; // 녹음 중일 때 ON 아이콘 표시
        if (micOffIcon) micOffIcon.style.opacity = isRecording ? '0' : '1'; // 녹음 중 아닐 때 OFF 아이콘 표시
    }

    function toggleVoiceRecognition() {
        if (!recognition) {
            alert('음성 인식이 지원되지 않는 브라우저입니다.');
            return;
        }
        try {
            if (!isRecognizing) {
                recognition.start(); // 음성 인식 시작
                isRecognizing = true;
            } else {
                recognition.stop(); // 음성 인식 중지 (onend 이벤트 트리거됨)
                // isRecognizing = false; // onend에서 처리하므로 여기서 변경 안 함
            }
        } catch (error) {
            // 간혹 이미 시작/중지된 상태에서 호출 시 오류 발생 가능
            console.error("음성 인식 시작/중지 오류:", error);
            isRecognizing = false; // 오류 발생 시 상태 강제 초기화
        }
        updateVoiceButtonState(); // 버튼 상태 즉시 업데이트
    }

    // --- Current Time Update ---
    function updateCurrentTime() {
        if (!currentTimeElement) return; // 시간 표시 요소 없으면 중단
        const now = new Date();
        // 한국 시간 형식으로 표시 (YYYY년 M월 D일 HH:MM)
        const formatter = new Intl.DateTimeFormat('ko-KR', {
            year: 'numeric',
            month: 'short', // 'numeric' 또는 'long' 가능
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // 24시간 형식
        });
        currentTimeElement.textContent = formatter.format(now);
    }

    // --- Event Listeners Setup ---

    // 이전 달 버튼
    prevMonthBtn?.addEventListener('click', (e) => {
        e.stopPropagation(); // 이벤트 버블링 방지
        currentDate.setMonth(currentDate.getMonth() - 1); // 현재 날짜를 이전 달로 변경
        updateCalendar(); // 달력 업데이트
    });

    // 다음 달 버튼
    nextMonthBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        currentDate.setMonth(currentDate.getMonth() + 1); // 현재 날짜를 다음 달로 변경
        updateCalendar();
    });

    // 월 선택기 헤더 클릭 (Date Picker 토글)
    monthSelector?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = datePicker.style.display === 'block';
        datePicker.style.display = isVisible ? 'none' : 'block'; // 표시 상태 토글
        if (!isVisible) {
            // Date Picker가 열릴 때 현재 달력의 연/월로 업데이트
            const year = currentDate.getFullYear();
            if (currentYearElement) currentYearElement.textContent = year;
            monthItems.forEach(item => {
                const monthIndex = parseInt(item.dataset.month);
                item.classList.toggle('selected', monthIndex === currentDate.getMonth());
            });
        }
    });

    // 월 선택 아이템 클릭
    monthItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const month = parseInt(item.dataset.month); // 선택된 월 (0~11)
            const year = parseInt(currentYearElement.textContent); // 현재 표시된 연도
            currentDate = new Date(year, month, 1); // 선택된 연/월로 currentDate 업데이트
            datePicker.style.display = 'none'; // Date Picker 닫기
            updateCalendar(); // 달력 업데이트
        });
    });

    // 연도 이전 버튼 (Date Picker 내)
    yearPrevBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentPickerYear = parseInt(currentYearElement.textContent);
        currentYearElement.textContent = currentPickerYear - 1; // 표시 연도 변경
        // 연도 변경 시 월 선택 상태 업데이트 (선택 사항)
        const currentCalendarMonth = currentDate.getMonth();
        const currentCalendarYear = currentDate.getFullYear();
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            item.classList.toggle('selected', monthIndex === currentCalendarMonth && (currentPickerYear - 1) === currentCalendarYear);
        });
    });

    // 연도 다음 버튼 (Date Picker 내)
    yearNextBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const currentPickerYear = parseInt(currentYearElement.textContent);
        currentYearElement.textContent = currentPickerYear + 1; // 표시 연도 변경
        // 연도 변경 시 월 선택 상태 업데이트 (선택 사항)
        const currentCalendarMonth = currentDate.getMonth();
        const currentCalendarYear = currentDate.getFullYear();
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            item.classList.toggle('selected', monthIndex === currentCalendarMonth && (currentPickerYear + 1) === currentCalendarYear);
        });
    });

    // 문서 전체 클릭 (Date Picker 외부 클릭 시 닫기)
    document.addEventListener('click', (e) => {
        // monthSelector나 datePicker 내부를 클릭한 것이 아닐 때만 닫기
        if (datePicker && datePicker.style.display === 'block' && !monthSelector?.contains(e.target) && !datePicker.contains(e.target)) {
            datePicker.style.display = 'none';
        }
    });

    // 메모 추가 버튼 클릭
    addMemoBtn?.addEventListener('click', addMemo);

    // 메모 입력 필드에서 Enter 키 입력
    memoInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addMemo();
        }
    });

    // 탭 클릭 (All, Active, Completed)
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active')); // 모든 탭 비활성화
            tab.classList.add('active'); // 클릭된 탭 활성화
            renderMemos(); // 활성화된 탭 기준으로 메모 다시 렌더링
        });
    });

    // --- Edit Modal Event Listeners ---
    // 저장 버튼
    saveEditBtn?.addEventListener('click', saveMemoEdit);
    // 취소 버튼
    cancelEditBtn?.addEventListener('click', closeModal);
    // 닫기(X) 버튼
    closeModalBtn?.addEventListener('click', closeModal);
    // 모달 배경 클릭 시 닫기
    editModal?.addEventListener('click', (e) => {
        if (e.target === editModal) { // 클릭된 요소가 모달 배경 자체일 때만
            closeModal();
        }
    });
    // ESC 키 누르면 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal?.style.display === 'flex') {
            closeModal();
        }
    });

    // --- Tooltip Event Listeners ---
    if (memoListContainer) {
        // 마우스 오버 시 툴팁 표시
        memoListContainer.addEventListener('mouseover', showTooltip);
        // 마우스 아웃 시 툴팁 숨김
        memoListContainer.addEventListener('mouseout', hideTooltip);
        // 스크롤 시 툴팁 숨김 (passive: true로 성능 최적화)
        memoListContainer.addEventListener('scroll', hideTooltip, { passive: true });
    }
    // 창 크기 변경 시 툴팁 숨김
    window.addEventListener('resize', hideTooltip, { passive: true });


    // --- Voice Recognition Setup ---
    if ('webkitSpeechRecognition' in window) { // 브라우저 지원 확인
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false; // 단일 결과 인식 후 종료
        recognition.interimResults = true; // 중간 결과 표시
        recognition.lang = 'ko-KR'; // 한국어 설정

        // 음성 인식 결과 처리
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
            // 최종 및 중간 결과를 합쳐 입력 필드에 표시
            if (memoInput) {
                memoInput.value = finalTranscript + interimTranscript;
            }
        };

        // 음성 인식 오류 처리
        recognition.onerror = (event) => {
            console.error('음성 인식 오류:', event.error);
            // 오류 종류에 따라 사용자에게 알림 제공 가능
            if (event.error === 'no-speech') {
                // alert('음성이 감지되지 않았습니다.');
            } else if (event.error === 'audio-capture') {
                alert('마이크 접근에 문제가 발생했습니다. 권한을 확인해주세요.');
            } else if (event.error === 'not-allowed') {
                alert('마이크 사용 권한이 거부되었습니다.');
            }
            isRecognizing = false; // 오류 발생 시 인식 상태 초기화
            updateVoiceButtonState(); // 버튼 상태 업데이트
        };

        // 음성 인식 종료 시 처리
        recognition.onend = () => {
            isRecognizing = false; // 인식 상태 업데이트
            updateVoiceButtonState(); // 버튼 상태 업데이트
            // 최종 결과가 있으면 자동으로 메모 추가 (선택 사항)
            // const finalContent = memoInput.value.trim();
            // if (finalContent) {
            //     addMemo();
            // }
        };

        // 음성 버튼 클릭 시 인식 토글
        voiceBtn?.addEventListener('click', toggleVoiceRecognition);

    } else {
        // 음성 인식 미지원 브라우저 처리
        console.warn('음성 인식이 지원되지 않는 브라우저입니다.');
        voiceBtn?.addEventListener('click', () => alert('음성 인식이 지원되지 않는 브라우저입니다.'));
        voiceBtn?.setAttribute('disabled', 'true'); // 버튼 비활성화

        // 미지원 시 아이콘 처리 (예: 회색 마이크 아이콘만 표시)
        if (micOffIcon) micOffIcon.style.opacity = '1';
        if (micOnIcon) micOnIcon.style.opacity = '0';
        if (voiceBtn) voiceBtn.style.cursor = 'not-allowed';
    }

    // --- Initialization ---
    updateCurrentTime(); // 초기 시간 표시
    setInterval(updateCurrentTime, 1000); // 1초마다 시간 업데이트
    updateCalendar(); // 초기 달력 렌더링 (renderMemos 내부 호출 포함)
    updateVoiceButtonState(); // 초기 음성 버튼 상태 설정
});
