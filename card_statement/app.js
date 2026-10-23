
const LIFF_ID = "2009933896-DAppqJsp";
const API_BASE = "https://line-bot-on-render-combine-one-singapore.onrender.com";

// LINE ID Token
let idToken = "";

// DOM 元素
const statusEl = document.getElementById("status");
const cardSelect = document.getElementById("cardSelect");
const monthSelect = document.getElementById("monthSelect");
const resultArea = document.getElementById("resultArea");
const totalAmountEl = document.getElementById("totalAmount");
const recordCountEl = document.getElementById("recordCount");
const detailList = document.getElementById("detailList");


// ==============================
// 1. 初始化 LIFF
// ==============================
async function initLIFF() {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    idToken = liff.getIDToken();

    if (!idToken) {
      throw new Error("無法取得 LINE ID Token");
    }

    setStatus("正在載入信用卡清單...", "info");

    await loadCards();

    setStatus("請選擇信用卡及帳單期間", "success");

  } catch (error) {
    console.error("LIFF 初始化失敗：", error);
    setStatus(error.message || "初始化失敗，請稍後再試", "danger");
  }
}


// ==============================
// 2. 共用 API 呼叫函式
// ==============================
async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${idToken}`
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`API 錯誤 (${response.status})：${message}`);
  }

  return response.json();
}


// ==============================
// 3. 取得信用卡清單
// GET /api/cards
// ==============================
async function loadCards() {
    const cardSelect = document.getElementById("cardSelect");

    console.log("1. loadCards 開始執行");
    console.log("2. 找到下拉選單：", cardSelect);

    try {
        const data = await apiGet("/api/cards");

        console.log("3. API 回傳資料：", data);
        console.log("4. 是否為陣列：", Array.isArray(data));

        if (!Array.isArray(data)) {
            throw new Error("API 回傳的不是陣列");
        }

        cardSelect.innerHTML = '<option value="">請選擇信用卡</option>';

        data.forEach(cardName => {
            const option = document.createElement("option");
            option.value = cardName;
            option.textContent = cardName;
            cardSelect.appendChild(option);
        });

        console.log("5. 下拉選單選項：", cardSelect.innerHTML);

    } catch (error) {
        console.error("載入信用卡失敗：", error);
    }
}


// ==============================
// 4. 選擇信用卡後，載入帳單月份
// GET /api/card-statement-months
// ==============================
async function loadMonths(cardId) {
  monthSelect.disabled = true;
  monthSelect.innerHTML =
    '<option value="">載入帳單期間中...</option>';

  resultArea.classList.add("d-none");

  const data = await apiGet(
    `/api/card-statement-months?card_id=${encodeURIComponent(cardId)}`
  );

  // 預期格式：{ "months": ["2026-10", "2026-09"] }
  const months = data.months;

  if (!Array.isArray(months)) {
    throw new Error("帳單月份 API 回傳格式不正確");
  }

  monthSelect.innerHTML =
    '<option value="">請選擇帳單期間</option>';

  months.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
  });

  monthSelect.disabled = months.length === 0;

  if (months.length === 0) {
    monthSelect.innerHTML =
      '<option value="">沒有可查詢的帳單期間</option>';
  }
}


// ==============================
// 5. 取得指定月份的消費明細
// GET /api/card-statements
// ==============================
async function loadStatements(cardId, month) {
  resultArea.classList.add("d-none");
  detailList.replaceChildren();

  setStatus("正在載入消費明細...", "info");

  const data = await apiGet(
    `/api/card-statements?card_id=${encodeURIComponent(cardId)}` +
    `&statement_period=${encodeURIComponent(month)}`
  );

  // 預期格式：
  // {
  //   "items": [
  //     {
  //       "date": "2026-10-03",
  //       "item": "超商消費",
  //       "amount": 120,
  //       "category": "餐飲"
  //     }
  //   ],
  //   "total": 120,
  //   "count": 1
  // }

  const items = data.items;

  if (!Array.isArray(items)) {
    throw new Error("帳單明細 API 回傳格式不正確");
  }

  // 若後端沒有回傳 total/count，就由明細計算
  const total = data.total != null
    ? Number(data.total)
    : items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const count = data.count ?? items.length;

  totalAmountEl.textContent = formatMoney(total);
  recordCountEl.textContent = `共 ${count} 筆`;

  if (items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "alert alert-secondary";
    empty.textContent = "這個帳單期間沒有消費明細";
    detailList.appendChild(empty);
  } else {
    items.forEach(item => {
      detailList.appendChild(createDetailCard(item));
    });
  }

  resultArea.classList.remove("d-none");
  setStatus("帳單載入完成", "success");
}


// ==============================
// 6. 建立單筆消費卡片
// ==============================
function createDetailCard(item) {
  const card = document.createElement("div");
  card.className = "card mb-2";

  const body = document.createElement("div");
  body.className = "card-body";

  const row = document.createElement("div");
  row.className = "d-flex justify-content-between gap-3";

  const left = document.createElement("div");
  left.className = "flex-grow-1";

  const title = document.createElement("div");
  title.className = "fw-bold";
  title.textContent = item.item ?? item.note ?? "未提供品項";

  const info = document.createElement("div");
  info.className = "text-secondary small mt-1";
  info.textContent = [
    item.date ?? "",
    item.category ?? ""
  ].filter(Boolean).join(" · ");

  const amount = document.createElement("div");
  amount.className = "fw-bold text-nowrap";
  amount.textContent = formatMoney(item.amount);

  left.append(title, info);
  row.append(left, amount);
  body.appendChild(row);
  card.appendChild(body);

  return card;
}


// ==============================
// 7. 金額與狀態顯示
// ==============================
function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "$0";
  }

  return "$" + amount.toLocaleString("zh-TW", {
    maximumFractionDigits: 2
  });
}

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.className = `alert alert-${type}`;
}


// ==============================
// 8. 綁定選單事件
// ==============================

// 使用者更換信用卡
cardSelect.addEventListener("change", async () => {
  const cardId = cardSelect.value;

  monthSelect.disabled = true;
  monthSelect.innerHTML =
    '<option value="">請先選擇信用卡</option>';

  resultArea.classList.add("d-none");

  if (!cardId) {
    setStatus("請選擇信用卡", "info");
    return;
  }

  try {
    setStatus("正在取得帳單期間...", "info");
    await loadMonths(cardId);

    if (!monthSelect.disabled) {
      setStatus("請選擇帳單期間", "success");
    } else {
      setStatus("這張信用卡目前沒有帳單資料", "warning");
    }
  } catch (error) {
    console.error(error);
    setStatus(error.message || "無法取得帳單期間", "danger");
  }
});


// 使用者更換帳單月份
monthSelect.addEventListener("change", async () => {
  const cardId = cardSelect.value;
  const month = monthSelect.value;

  if (!cardId || !month) {
    resultArea.classList.add("d-none");
    return;
  }

  try {
    await loadStatements(cardId, month);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "無法取得帳單明細", "danger");
  }
});


// 啟動
initLIFF();
