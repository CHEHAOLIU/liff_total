let categories = [];
let profile = null;
let idToken = null;

console.log("APP JS LOADED");

async function init() {

    //console.log("A. 開始初始化");

    await liff.init({
        liffId: "2009933896-IKoH3PQY"
    });

    //console.log("B. LIFF 初始化完成");

    if (!liff.isLoggedIn()) {
        liff.login();
        return;
    }

    profile = await liff.getProfile();
    idToken = liff.getIDToken();
    //console.log("C. 使用者資料取得完成");

    await loadCategories();
    //console.log("D. 分類載入完成");

    await loadBudget();  
    //console.log("E. 預算載入完成"); 
}

init();


//========================
// 載入分類
//========================
async function loadCategories() {

    const res = await fetch("https://line-bot-on-render-combine-one-singapore.onrender.com/api/categories");
    categories = await res.json();

    const incomeContainer = document.getElementById("income-form");
    const expenseContainer = document.getElementById("expense-form");

    incomeContainer.innerHTML = "";
    expenseContainer.innerHTML = "";

    categories.forEach(c => {

        const item = document.createElement("div");
        item.className = "category-item";

        const label = document.createElement("div");
        label.className = "category-label";
        label.innerText = c.categories;

        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "numeric";
        input.placeholder = "0";
        input.className = "form-control amount-input";
        input.id = c.categories;

        // 用 data-type 記錄收入/支出
        input.dataset.type = c.type;

        input.addEventListener("input", () => {

            let value = input.value.replace(/,/g, "");

            if (isNaN(value)) return;

            input.value = value
                ? Number(value).toLocaleString()
                : "";

            updateTotal();

        });

        item.appendChild(label);
        item.appendChild(input);

        if (c.type === "收入") {
            incomeContainer.appendChild(item);
        } else {
            expenseContainer.appendChild(item);
        }

    });

    updateTotal();

}


// ========================
//    載入已儲存的預算
// ======================== 
async function loadBudget() {
    try {
        //console.log("① 開始載入預算");
        //console.log("② idToken 是否存在：", !!idToken);

        const res = await fetch(
            "https://line-bot-on-render-combine-one-singapore.onrender.com/api/budget",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${idToken}`
                }
            }
        );

       // console.log("③ API HTTP 狀態：", res.status);

        const data = await res.json();

        // 只記錄預算資料，不要輸出 Token
       // console.log("④ API 回傳資料：", data);
       // console.log("⑤ 分類清單：", categories);

        const budgets = data.budgets || {};

        categories.forEach(c => {
            const input = document.getElementById(c.categories);

            if (!input) {
                console.warn("找不到分類輸入欄位：", c.categories);
                return;
            }

            const amount = Number(budgets[c.categories]) || 0;
            input.value = amount.toLocaleString();
        });

        updateTotal();

        //console.log("⑥ 預算載入完成");

    } catch (error) {
        //console.error("載入預算失敗：", error);
    }
}






//========================
// 更新收入、支出總額
//========================
function updateTotal() {
     
    //console.log("income-total:",
    //document.getElementById("income-total"));

   //console.log("expense-total:",
    //document.getElementById("expense-total"));

    //console.log("balance-total:",
    //document.getElementById("balance-total"));

    let incomeTotal = 0;
    let expenseTotal = 0;

    document.querySelectorAll(".amount-input").forEach(input => {

        const value = Number(input.value.replace(/,/g, "")) || 0;

        if (input.dataset.type === "收入") {
            incomeTotal += value;
        } else {
            expenseTotal += value;
        }

    });

    document.getElementById("income-total").innerText =
        incomeTotal.toLocaleString();

    document.getElementById("expense-total").innerText =
        expenseTotal.toLocaleString();

    document.getElementById("balance-total").innerText =
        (incomeTotal - expenseTotal).toLocaleString();


}


//========================
// 儲存預算
//========================
async function submitBudget() {

    const budgets = {};

    categories.forEach(c => {

        const input = document.getElementById(c.categories);

        budgets[c.categories] =
            Number(input.value.replace(/,/g, "")) || 0;

    });

    document.getElementById("status").innerText = "送出中...";

    await fetch("https://line-bot-on-render-combine-one-singapore.onrender.com/api/budget", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
            budgets: budgets
        })
    });

    document.getElementById("status").innerText = "✅ 已儲存";

}

// ========================
// 頁面切換
// ========================

async function switchTab(tab) {

    const settingView =
        document.getElementById("setting-view");

    const progressView =
        document.getElementById("progress-view");

    const btnSetting =
        document.getElementById("btn-setting");

    const btnProgress =
        document.getElementById("btn-progress");

    if (tab === "setting") {

        settingView.style.display = "block";
        progressView.style.display = "none";

        btnSetting.className = "btn btn-primary";
        btnProgress.className = "btn btn-outline-primary";

    } else {

        settingView.style.display = "none";
        progressView.style.display = "block";

        btnSetting.className = "btn btn-outline-primary";
        btnProgress.className = "btn btn-primary";

        await loadBudgetProgress();
    }
}

// ========================
// 顯示預算使用進度
// ========================
function renderProgress(data, budgetData) {

    const incomeContainer =
        document.getElementById("income-progress");

    const expenseContainer =
        document.getElementById("expense-progress");

    const monthContainer =
        document.getElementById("progress-month");

    // 清空舊資料
    incomeContainer.innerHTML = "";
    expenseContainer.innerHTML = "";

    // 顯示月份
    monthContainer.innerText = `統計月份：${data.month}`;

    // 取得預算與實際金額
    const budgets = budgetData.budgets || {};
    const actuals = data.actuals || {};

    // 分別處理收入與支出
    ["收入", "支出"].forEach(type => {

        const container = type === "收入"
            ? incomeContainer
            : expenseContainer;

        categories
            .filter(c => c.type === type)
            .forEach(c => {

                const category = c.categories;

                const budget = Number(budgets[category]) || 0;

                const actual = Number(
                    actuals[type]?.[category]
                ) || 0;

                const percent = budget > 0
                    ? actual / budget * 100
                    : 0;

                const displayPercent = Math.round(percent);

                const item = document.createElement("div");
                item.className = "mb-3";

                const barColor = type === "收入"
                    ? "bg-success"
                    : (percent > 100 ? "bg-danger" : "bg-primary");

                item.innerHTML = `
                    <div class="d-flex justify-content-between mb-1">
                        <strong>${category}</strong>
                        <span>
                            ${actual.toLocaleString()} /
                            ${budget.toLocaleString()}
                        </span>
                    </div>

                    <div class="progress" style="height: 12px;">
                        <div
                            class="progress-bar ${barColor}"
                            role="progressbar"
                            style="width: ${Math.min(percent, 100)}%">
                        </div>
                    </div>

                    <small class="text-muted">
                        ${displayPercent}%
                    </small>
                `;

                container.appendChild(item);

            });

    });

}

// ========================
// 載入預算使用狀況
// ========================
async function loadBudgetProgress() {

    try {

        const baseUrl =
            "https://line-bot-on-render-combine-one-singapore.onrender.com";

        // 同時取得實際收支與預算資料
        const [progressRes, budgetRes] = await Promise.all([

            fetch(`${baseUrl}/api/budget/progress`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${idToken}`
                }
            }),

            fetch(`${baseUrl}/api/budget`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${idToken}`
                }
            })

        ]);

        const progressData = await progressRes.json();
        const budgetData = await budgetRes.json();

        if (!progressRes.ok) {
            throw new Error(progressData.error || "取得實際收支失敗");
        }

        if (!budgetRes.ok) {
            throw new Error(budgetData.error || "取得預算資料失敗");
        }

        renderProgress(progressData, budgetData);

    } catch (error) {

        console.error("載入預算使用狀況失敗：", error);

        document.getElementById("progress-month").innerText =
            "預算資料載入失敗，請稍後再試。";

    }

}