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
function renderProgress(data) {

    const container = document.getElementById("progress-content");

    container.innerHTML = "";

    const types = ["收入", "支出"];

    types.forEach(type => {

        const section = document.createElement("div");

        section.innerHTML = `<h5>${type}預算使用狀況</h5>`;

        categories
            .filter(c => c.type === type)
            .forEach(c => {

                const budget = Number(
                    data.budgets?.[type]?.[c.categories]
                ) || 0;

                const actual = Number(
                    data.actuals?.[type]?.[c.categories]
                ) || 0;

                const percent = budget > 0
                    ? actual / budget * 100
                    : 0;

                const displayPercent = Math.round(percent);

                const item = document.createElement("div");

                item.className = "mb-3";

                item.innerHTML = `
                    <div class="d-flex justify-content-between">
                        <strong>${c.categories}</strong>
                        <span>${actual.toLocaleString()} / ${budget.toLocaleString()}</span>
                    </div>

                    <div class="progress">
                        <div class="progress-bar"
                             role="progressbar"
                             style="width: ${Math.min(percent, 100)}%">
                        </div>
                    </div>

                    <small>${displayPercent}%</small>
                `;

                section.appendChild(item);

            });

        container.appendChild(section);

    });

}

// ========================
// 載入預算使用狀況
// ========================
async function loadBudgetProgress() {

    try {

        const res = await fetch(
            "https://line-bot-on-render-combine-one-singapore.onrender.com/api/budget/progress",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${idToken}`
                }
            }
        );

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "載入失敗");
        }

        renderProgress(data);

    } catch (error) {

        console.error("載入預算使用狀況失敗：", error);

    }

}