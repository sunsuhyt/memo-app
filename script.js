document.addEventListener('DOMContentLoaded', () => {
    const memoList = document.getElementById('memo-list');
    const addMemoBtn = document.getElementById('add-memo');
    const memoInput = document.getElementById('memo-content');
    const tabs = document.querySelectorAll('.tab');
    const currentTimeElement = document.querySelector('.current-time');
    const voiceBtn = document.getElementById('voice-memo');
    const micOnText = voiceBtn.querySelector('.mic-on');
    const micOffText = voiceBtn.querySelector('.mic-off');

    let memos = JSON.parse(localStorage.getItem('memos')) || [];
    let recognition = null;
    let isRecognizing = false;

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
            document.getElementById('memo-content').value = text;
        };

        recognition.onend = () => {
            if (isRecognizing) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Recognition restart failed:', error);
                    isRecognizing = false;
                    voiceBtn.classList.remove('recording');
                }
            } else {
                voiceBtn.classList.remove('recording');
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isRecognizing = false;
            voiceBtn.classList.remove('recording');
        };
    }

    function toggleVoiceRecognition() {
        if (!recognition) {
            console.error('Speech recognition not supported');
            return;
        }

        try {
            if (!isRecognizing) {
                recognition.start();
                isRecognizing = true;
                voiceBtn.classList.add('recording');
            } else {
                recognition.stop();
                isRecognizing = false;
                voiceBtn.classList.remove('recording');
            }
        } catch (error) {
            console.error('Error toggling voice recognition:', error);
            isRecognizing = false;
            voiceBtn.classList.remove('recording');
        }
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
        return [...memos].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    function renderMemos() {
        const memoList = document.getElementById('memo-list');
        memoList.innerHTML = '';
        
        const activeTab = document.querySelector('.tab.active').textContent;
        let filteredMemos = [...memos];

        // 탭별 필터링
        if (activeTab === 'Active') {
            filteredMemos = memos.filter(memo => !memo.completed);
        } else if (activeTab === 'Completed') {
            filteredMemos = memos.filter(memo => memo.completed);
        }

        // 날짜순 정렬
        filteredMemos.sort((a, b) => new Date(a.date) - new Date(b.date));

        filteredMemos.forEach(memo => {
            const memoItem = document.createElement('div');
            memoItem.className = 'memo-item';
            memoItem.innerHTML = `
                <div class="memo-checkbox ${memo.completed ? 'checked' : ''}"></div>
                <div class="memo-content ${memo.important ? 'important' : ''}">${memo.content}</div>
                <div class="memo-date">
                    ${formatDate(memo.date)}
                    <input type="date" value="${memo.date.split('T')[0]}" onchange="updateMemoDate(${memo.id}, this.value)">
                </div>
                <div class="memo-actions">
                    <button class="star-btn ${memo.important ? 'active' : ''}" onclick="toggleImportant(${memo.id})">★</button>
                    <button class="edit-btn" onclick="editMemo(${memo.id})">✎</button>
                    <button class="delete-btn" onclick="deleteMemo(${memo.id})">×</button>
                </div>
            `;
            memoList.appendChild(memoItem);
        });

        // 체크박스 이벤트 리스너
        document.querySelectorAll('.memo-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const memoItem = e.target.closest('.memo-item');
                const memoContent = memoItem.querySelector('.memo-content').textContent;
                const memoIndex = memos.findIndex(m => m.content === memoContent);
                if (memoIndex !== -1) {
                    memos[memoIndex].completed = !memos[memoIndex].completed;
                    localStorage.setItem('memos', JSON.stringify(memos));
                    renderMemos();
                }
            });
        });

        // 날짜 클릭 이벤트 리스너
        document.querySelectorAll('.memo-date').forEach(dateElement => {
            dateElement.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const sortedIndex = filteredMemos[index];
                const originalIndex = memos.findIndex(memo => memo === sortedIndex);
                const currentDate = new Date(memos[originalIndex].date);
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${day}`;

                // 달력 입력 필드 생성
                const dateInput = document.createElement('input');
                dateInput.type = 'date';
                dateInput.value = dateString;
                dateInput.style.position = 'absolute';
                dateInput.style.left = '0';
                dateInput.style.top = '0';
                dateInput.style.opacity = '0';
                dateInput.style.width = '100%';
                dateInput.style.height = '100%';
                dateInput.style.cursor = 'pointer';

                // 기존 날짜 텍스트를 숨기고 달력 입력 필드 추가
                dateElement.style.position = 'relative';
                dateElement.appendChild(dateInput);

                // 달력이 선택되면 날짜 업데이트
                dateInput.addEventListener('change', () => {
                    if (dateInput.value) {
                        memos[originalIndex].date = new Date(dateInput.value).toISOString();
                        localStorage.setItem('memos', JSON.stringify(memos));
                        renderMemos();
                    }
                });

                // 달력 입력 필드 클릭
                dateInput.click();
            });
        });

        // 별표 버튼 이벤트 리스너
        document.querySelectorAll('.star-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const sortedIndex = filteredMemos[index];
                const originalIndex = memos.findIndex(memo => memo === sortedIndex);
                memos[originalIndex].important = !memos[originalIndex].important;
                localStorage.setItem('memos', JSON.stringify(memos));
                renderMemos();
            });
        });

        // 삭제 버튼 이벤트 리스너
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const sortedIndex = filteredMemos[index];
                const originalIndex = memos.findIndex(memo => memo === sortedIndex);
                memos.splice(originalIndex, 1);
                localStorage.setItem('memos', JSON.stringify(memos));
                renderMemos();
            });
        });

        // 수정 버튼 이벤트 리스너
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const sortedIndex = filteredMemos[index];
                const originalIndex = memos.findIndex(memo => memo === sortedIndex);
                const newContent = prompt('메모를 수정하세요:', memos[originalIndex].content);
                if (newContent !== null) {
                    memos[originalIndex].content = newContent;
                    localStorage.setItem('memos', JSON.stringify(memos));
                    renderMemos();
                }
            });
        });
    }

    // 초기 메모 목록 렌더링
    renderMemos();

    // 메모 추가 버튼 클릭 이벤트
    addMemoBtn.addEventListener('click', () => {
        const content = memoInput.value.trim();
        if (content) {
            memos.push({
                content,
                completed: false,
                important: false,
                date: new Date().toISOString()
            });
            localStorage.setItem('memos', JSON.stringify(memos));
            memoInput.value = '';
            renderMemos();
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
}); 