// Firebase 연동 및 메모 관리 로직
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 🔧 여기에 당신의 Firebase 설정을 입력하세요!
const firebaseConfig = {
  apiKey: "AIzaSyC1LnyDi8jEKLwJw1HMj6NukjCuwLfDWEY",
  authDomain: "memo-web-d68f4.firebaseapp.com",
  projectId: "memo-web-d68f4",
  storageBucket: "memo-web-d68f4.firebasestorage.app",
  messagingSenderId: "733139885031",
  appId: "1:733139885031:web:e328691affcde5f1403b42",
  measurementId: "G-H5XXSD2D97"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const memosRef = collection(db, "memos");

// 요소 가져오기
const memoInput = document.getElementById("memo-content");
const addMemoBtn = document.getElementById("add-memo");
const memoList = document.getElementById("memo-list");
const tabs = document.querySelectorAll(".tab");

let currentTab = "All"; // All, Active, Completed

// 필터링 함수
function shouldShow(memoData) {
  if (currentTab === "All") return true;
  if (currentTab === "Active") return !memoData.completed;
  if (currentTab === "Completed") return memoData.completed;
  return true;
}

// 메모 불러오기 및 화면에 표시하기
function renderMemos() {
  onSnapshot(memosRef, (snapshot) => {
    memoList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const memo = docSnap.data();
      const id = docSnap.id;
      if (!shouldShow(memo)) return;

      const memoItem = document.createElement("div");
      memoItem.className = "memo-item";

      const checkbox = document.createElement("div");
      checkbox.className = "memo-checkbox" + (memo.completed ? " checked" : "");
      checkbox.addEventListener("click", async () => {
        await updateDoc(doc(memosRef, id), { completed: !memo.completed });
      });

      const content = document.createElement("div");
      content.className = "memo-content";
      content.textContent = memo.content;

      const date = document.createElement("div");
      date.className = "memo-date";
      date.textContent = new Date(memo.createdAt).toLocaleString("ko-KR");

      const actions = document.createElement("div");
      actions.className = "memo-actions";
      const delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", async () => {
        if (confirm("삭제할까요?")) {
          await deleteDoc(doc(memosRef, id));
        }
      });

      actions.appendChild(delBtn);
      memoItem.appendChild(checkbox);
      memoItem.appendChild(content);
      memoItem.appendChild(date);
      memoItem.appendChild(actions);
      memoList.appendChild(memoItem);
    });
  });
}

// 메모 추가
addMemoBtn.addEventListener("click", async () => {
  const content = memoInput.value.trim();
  if (!content) return;
  await addDoc(memosRef, {
    content,
    completed: false,
    createdAt: new Date().toISOString()
  });
  memoInput.value = "";
});

// 엔터로 메모 추가
memoInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addMemoBtn.click();
  }
});

// 탭 클릭 시 필터 변경
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.textContent.trim();
    renderMemos();
  });
});

// 시작
window.addEventListener("DOMContentLoaded", () => {
  renderMemos();
});
