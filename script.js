document.addEventListener('DOMContentLoaded', () => {
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
    const memoContainer = document.querySelector('.memo-container');
    const memoList = document.getElementById('memo-list');
    const addMemoBtn = document.getElementById('add-memo');
    const memoInput = document.getElementById('memo-content');
    const selectedDateElement = document.getElementById('selected-date');
    const closeMemoBtn = document.getElementById('close-memo');
    const tabs = document.querySelectorAll('.tab');
    const currentTimeElement = document.querySelector('.current-time');
    const voiceBtn = document.getElementById('voice-memo');
    const micOnText = voiceBtn.querySelector('.mic-on');
    const micOffText = voiceBtn.querySelector('.mic-off');

    let currentDate = new Date();
    let selectedYear = currentDate.getFullYear();
    let selectedDate = new Date();
    let memos = JSON.parse(localStorage.getItem('memos')) || [];
    let recognition = null;
    let isRecognizing = false;

    const editModal = document.querySelector('.edit-modal');
    const editContent = document.getElementById('edit-content');
    const editStartDate = document.getElementById('edit-start-date');
    const editStartTime = document.getElementById('edit-start-time');
    const editEndDate = document.getElementById('edit-end-date');
    const editEndTime = document.getElementById('edit-end-time');
    const saveEditBtn = document.getElementById('save-edit');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const closeModalBtn = document.querySelector('.close-modal');
    
    let editingMemoIndex = -1;

    
    // 공휴일 정보
    const holidays = {
        // 양력 공휴일 (월, 일)
        "1-1": "신정",
        "3-1": "삼일절",
        "5-5": "어린이날",
        "6-6": "현충일",
        "8-15": "광복절",
        "10-3": "개천절",
        "10-9": "한글날",
        "12-25": "크리스마스"
    };

    // 음력 공휴일 (2024년 기준)
    const lunarHolidays2024 = {
        "2-9": "설날",
        "2-10": "설날",
        "2-11": "설날",
        "5-14": "부처님오신날",
        "9-16": "추석",
        "9-17": "추석",
        "9-18": "추석"
    };

    // 공휴일 체크 함수
    function isHoliday(year, month, day) {
        // 양력 공휴일 체크
        const monthDayKey = `${month + 1}-${day}`;
        if (holidays[monthDayKey]) {
            return holidays[monthDayKey];
        }

        // 2024년 음력 공휴일 체크 (2024년만 처리)
        if (year === 2024) {
            if (lunarHolidays2024[monthDayKey]) {
                return lunarHolidays2024[monthDayKey];
            }
        }

        return null;
    }

    // 이전/다음 달 버튼 이벤트
    prevMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        currentDate = prevMonth;
        selectedYear = currentDate.getFullYear();
        updateMonthDisplay();
        updateCalendar();
        renderMemos();
    });

    nextMonthBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        currentDate = nextMonth;
        selectedYear = currentDate.getFullYear();
        updateMonthDisplay();
        updateCalendar();
        renderMemos();
    });

    // 월 표시 업데이트 함수
    function updateMonthDisplay() {
        currentMonthElement.textContent = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;
        currentYearElement.textContent = currentDate.getFullYear();
        
        // 월 선택기에서 현재 월 강조
        monthItems.forEach(item => {
            const monthIndex = parseInt(item.dataset.month);
            if (monthIndex === currentDate.getMonth()) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // 월 선택기 토글
    monthSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = datePicker.style.display === 'block';
        datePicker.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            updateMonthDisplay();
        }
    });

    // 월 선택
    monthItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const month = parseInt(item.dataset.month);
            currentDate.setMonth(month);
            updateMonthDisplay();
            updateCalendar();
            renderMemos();
            datePicker.style.display = 'none';
        });
    });

    // 년도 변경
    yearPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedYear--;
        currentDate.setFullYear(selectedYear);
        updateMonthDisplay();
        updateCalendar();
        renderMemos();
    });

    yearNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedYear++;
        currentDate.setFullYear(selectedYear);
        updateMonthDisplay();
        updateCalendar();
        renderMemos();
    });

    // 외부 클릭 시 날짜 선택기 닫기
    document.addEventListener('click', (e) => {
        if (!monthSelector.contains(e.target)) {
            datePicker.style.display = 'none';
        }
    });
    
    function toDateOnly(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }    

    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        currentMonthElement.textContent = `${year}년 ${month + 1}월`;
        currentYearElement.textContent = year;
        selectedYear = year;
       
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startingDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        // 이전 달의 마지막 날짜들
        const prevMonth = new Date(year, month, 0);
        const prevMonthDays = prevMonth.getDate();

        calendarDays.innerHTML = '';
        let dayCount = 1;
        let nextMonthDay = 1;

        for (let i = 0; i < 42; i++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            
            if (i < startingDay) {
                // 이전 달의 날짜
                const prevDate = prevMonthDays - (startingDay - i - 1);
                dayElement.textContent = prevDate;
                dayElement.classList.add('other-month');
            } else if (dayCount <= totalDays) {
                // 현재 달의 날짜
                dayElement.textContent = dayCount;
                
                // 공휴일 체크 및 표시
                const holidayName = isHoliday(year, month, dayCount);
                if (holidayName) {
                    dayElement.classList.add('holiday');
                    // 공휴일 이름을 툴팁으로 표시
                    dayElement.setAttribute('title', holidayName);
                }

                const today = new Date();
                if (year === today.getFullYear() && month === today.getMonth() && dayCount === today.getDate()) {
                    dayElement.classList.add('today');
                }

                // 선택된 날짜 표시
                if (year === selectedDate.getFullYear() && month === selectedDate.getMonth() && dayCount === selectedDate.getDate()) {
                    dayElement.classList.add('selected');
                }

                // 메모 있는 날짜 표시 (기간 포함)
                const currentDate = new Date(year, month, dayCount);
                currentDate.setHours(0, 0, 0, 0); // ← 여기도 꼭 초기화!
                
                const hasMemo = memos.some(memo => {
                    const startDate = toDateOnly(memo.startDate || memo.date);
                    const endDate = toDateOnly(memo.endDate || memo.date);
                    return currentDate >= startDate && currentDate <= endDate;
                });
                

                if (hasMemo) {
                    dayElement.classList.add('has-memo');
                }

                // 날짜 클릭 이벤트
                const currentDayCount = dayCount;
                dayElement.addEventListener('click', () => {
                    selectedDate = new Date(year, month, currentDayCount);
                    updateCalendar();
                    renderMemos();  // 메모 목록 업데이트
                    memoInput.focus();
                });

                dayCount++;
            } else {
                // 다음 달의 날짜
                dayElement.textContent = nextMonthDay;
                dayElement.classList.add('other-month');
                nextMonthDay++;
            }

            calendarDays.appendChild(dayElement);
        }

        renderMemos();
    }
 

    function showMemos(dateStr) {
        const dayMemos = memos.filter(memo => memo.date === dateStr);
        memoList.innerHTML = '';
        dayMemos.forEach((memo, index) => {
            const memoElement = document.createElement('div');
            memoElement.className = 'memo-item';
            memoElement.innerHTML = `
                <span>${memo.content}</span>
                <button class="delete-memo" data-index="${index}">×</button>
            `;
            memoList.appendChild(memoElement);
        });

        // 삭제 버튼 이벤트 리스너
        memoList.querySelectorAll('.delete-memo').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                memos.splice(index, 1);
                localStorage.setItem('memos', JSON.stringify(memos));
                showMemos(dateStr);
                updateCalendar();
            });
        });
    }

    function updateVoiceButtonState() {
        if (isRecognizing) {
            voiceBtn.classList.add('recording');
            micOnText.style.display = 'block';
            micOffText.style.display = 'none';
        } else {
            voiceBtn.classList.remove('recording');
            micOnText.style.display = 'none';
            micOffText.style.display = 'block';
        }
    }

    // 음성인식 초기화
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event) => {
            const text = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            memoInput.value = text;
        };

        recognition.onend = () => {
            if (isRecognizing) {
                recognition.start();
            }
            updateVoiceButtonState();
        };
    }

    function toggleVoiceRecognition() {
        if (!recognition) return;

        if (!isRecognizing) {
            recognition.start();
            isRecognizing = true;
        } else {
            recognition.stop();
            isRecognizing = false;
        }
        updateVoiceButtonState();
    }

    // 초기 상태 설정
    updateVoiceButtonState();

    voiceBtn.addEventListener('click', toggleVoiceRecognition);

    function updateCurrentTime() {
        const now = new Date();
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        currentTimeElement.textContent = now.toLocaleDateString('ko-KR', options);
    }

    // 초기 시간 표시 및 1초마다 업데이트
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    function formatDate(date) {
        return new Date(date).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
        });
    }

    function sortMemosByDate(memos) {
        return [...memos].sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    function renderMemos() {
        const activeTab = document.querySelector('.tab.active').textContent;
        let filteredMemos = [...memos];

        // 탭별 필터링
        if (activeTab === 'Active') {
            // 선택된 날짜의 메모만 필터링 (완료되지 않은 메모 중에서)
            const selectedDateStr = selectedDate.toISOString().split('T')[0];
            filteredMemos = memos.filter(memo => {
                if (memo.completed) return false;
                
                const startDate = new Date(memo.startDate || memo.date);
                const endDate = new Date(memo.endDate || memo.date);
                const currentDate = new Date(selectedDate);
                
                // 날짜 비교를 위해 시간을 00:00:00으로 설정
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                currentDate.setHours(0, 0, 0, 0);
                
                // 선택된 날짜가 메모의 기간 내에 있는지 확인
                return currentDate >= startDate && currentDate <= endDate;
            });
        } else if (activeTab === 'Completed') {
            filteredMemos = memos.filter(memo => memo.completed);
        }

        // 현재 월의 메모만 필터링 (All 탭에서만 적용)
        if (activeTab === 'All') {
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth();
            filteredMemos = filteredMemos.filter(memo => {
                const memoDate = new Date(memo.date);
                return memoDate.getFullYear() === currentYear && memoDate.getMonth() === currentMonth;
            });
        }

        // 날짜순 정렬 (빠른 날짜가 위로)
        filteredMemos.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 메모 목록 렌더링
        memoList.innerHTML = '';
        if (filteredMemos.length === 0) {
            // 메모가 없을 때 메시지 표시
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-message';
            emptyMessage.textContent = activeTab === 'Active' ? 
                '선택한 날짜에 할 일이 없습니다.' : 
                '메모가 없습니다.';
            memoList.appendChild(emptyMessage);
            return;
        }
          
        filteredMemos.forEach((memo) => {
            const originalIndex = memos.findIndex(m => m.date === memo.date && m.content === memo.content);
            const startDate = new Date(memo.startDate || memo.date);
            const endDate = new Date(memo.endDate || memo.date);
            
            const memoElement = document.createElement('div');
            memoElement.className = 'memo-item';
            
            // 날짜 표시 형식 설정
            let dateDisplay;
            if (memo.startDate && memo.endDate && memo.startDate !== memo.endDate) {
                dateDisplay = `
                    <div class="memo-date-range">
                        <span>${startDate.getDate()}일 ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}</span>
                        <span>~</span>
                        <span>${endDate.getDate()}일 ${endDate.getHours()}:${String(endDate.getMinutes()).padStart(2, '0')}</span>
                    </div>`;
            } else {
                dateDisplay = `<div class="memo-date">${startDate.getDate()}일 ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}</div>`;
            }

            memoElement.innerHTML = `
                <div class="memo-checkbox ${memo.completed ? 'checked' : ''}" data-index="${originalIndex}"></div>
                <div class="memo-content ${memo.important ? 'important' : ''}" data-content="${memo.content}">${memo.content}</div>
                ${dateDisplay}
                <div class="memo-actions">
                    <button class="star-btn ${memo.important ? 'active' : ''}" data-index="${originalIndex}">★</button>
                    <button class="edit-btn" data-index="${originalIndex}">✎</button>
                    <button class="delete-btn" data-index="${originalIndex}">×</button>
                </div>
            `;

            // 체크박스 이벤트 리스너
            const checkbox = memoElement.querySelector('.memo-checkbox');
            checkbox.addEventListener('click', () => {
                const index = parseInt(checkbox.dataset.index);
                toggleMemoComplete(index);
            });

            // 나머지 버튼들의 이벤트 리스너
            const starBtn = memoElement.querySelector('.star-btn');
            starBtn.addEventListener('click', () => toggleMemoImportant(originalIndex));

            const editBtn = memoElement.querySelector('.edit-btn');
            editBtn.addEventListener('click', () => editMemo(originalIndex));

            const deleteBtn = memoElement.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => deleteMemo(originalIndex));

            memoList.appendChild(memoElement);
        });
    }

    // 메모 완료 상태 토글
    function toggleMemoComplete(index) {
        if (index >= 0 && index < memos.length) {
            memos[index].completed = !memos[index].completed;
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos();
        }
    }

    // 메모 중요 표시 토글
    function toggleMemoImportant(index) {
        if (index >= 0 && index < memos.length) {
            memos[index].important = !memos[index].important;
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos();
        }
    }

    // 메모 수정
    function editMemo(index) {
        editingMemoIndex = index;
        const memo = memos[index];
        const startDate = new Date(memo.startDate || memo.date);
        const endDate = new Date(memo.endDate || memo.date);
        
        // 모달 입력 필드 초기화
        editContent.value = memo.content;
        editStartDate.value = startDate.toISOString().split('T')[0];
        editStartTime.value = startDate.toTimeString().slice(0, 5);
        editEndDate.value = endDate.toISOString().split('T')[0];
        editEndTime.value = endDate.toTimeString().slice(0, 5);
        
        // 모달 표시
        editModal.style.display = 'flex';
    }

    // 모달 닫기
    function closeModal() {
        editModal.style.display = 'none';
        editingMemoIndex = -1;
    }

    // 수정 내용 저장
    function saveMemoEdit() {
        if (editingMemoIndex === -1) return;

        const content = editContent.value.trim();
        if (!content) return;

        // 시작 날짜와 종료 날짜 설정
        const startDateStr = editStartDate.value;
        const startTimeStr = editStartTime.value;
        const endDateStr = editEndDate.value;
        const endTimeStr = editEndTime.value;

        const startDate = new Date(`${startDateStr}T${startTimeStr}`);
        const endDate = new Date(`${endDateStr}T${endTimeStr}`);

        // 종료 날짜가 시작 날짜보다 이전인 경우 경고
        if (endDate < startDate) {
            alert('종료 날짜는 시작 날짜보다 이후여야 합니다.');
            return;
        }

        // 메모 업데이트
        memos[editingMemoIndex] = {
            ...memos[editingMemoIndex],
            content: content,
            date: startDate.toISOString(),  // 호환성을 위해 유지
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };

        // 저장 및 화면 업데이트
        localStorage.setItem('memos', JSON.stringify(memos));
        renderMemos();
        updateCalendar();
        closeModal();
    }

    // 이벤트 리스너 추가
    saveEditBtn.addEventListener('click', saveMemoEdit);
    cancelEditBtn.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);

    // 모달 외부 클릭 시 닫기
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            closeModal();
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editModal.style.display === 'flex') {
            closeModal();
        }
    });

    // 메모 삭제
    function deleteMemo(index) {
        if (confirm('이 메모를 삭제하시겠습니까?')) {
            memos.splice(index, 1);
            localStorage.setItem('memos', JSON.stringify(memos));
            renderMemos();
        }
    }

    // 메모 추가
    addMemoBtn.addEventListener('click', () => {
        const content = memoInput.value.trim();
        if (content) {
            const now = new Date();
            // 선택된 날짜의 시간을 현재 시간으로 설정
            const memoDate = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                now.getHours(),
                now.getMinutes(),
                now.getSeconds()
            );

            memos.push({
                content: content,
                completed: false,
                important: false,
                date: memoDate.toISOString()
            });
            localStorage.setItem('memos', JSON.stringify(memos));
            memoInput.value = '';
            renderMemos();
            updateCalendar();  // 달력 업데이트하여 메모 표시 갱신
        }
    });

    // Enter 키로 메모 추가
    memoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addMemoBtn.click();
        }
    });

    // 탭 클릭 이벤트
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMemos();
        });
    });

    // 메모창 닫기
    closeMemoBtn.addEventListener('click', () => {
        memoContainer.style.display = 'none';
    });

    // 초기 달력 표시
    updateCalendar();

    // CSS 스타일을 위한 클래스 추가
    const style = document.createElement('style');
    style.textContent = `
        .empty-message {
            text-align: center;
            padding: 20px;
            color: #757575;
            font-size: 14px;
            background-color: #f5f5f5;
            border-radius: 8px;
            margin: 10px 0;
        }
    `;
    document.head.appendChild(style);
}); 

// 메모 클릭 시 전체 내용 보여주는 팝업창 기능
const viewModal = document.querySelector('.memo-view-modal');
const viewText = document.getElementById('memo-full-text');
const closeViewBtn = document.querySelector('.close-view-modal');

document.getElementById('memo-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('memo-content')) {
        const content = e.target.getAttribute('data-content');
        viewText.textContent = content;
        viewModal.style.display = 'flex';
    }
});

closeViewBtn.addEventListener('click', () => {
    viewModal.style.display = 'none';
});

viewModal.addEventListener('click', (e) => {
    if (e.target === viewModal) {
        viewModal.style.display = 'none';
    }
});

