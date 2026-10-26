let categories = [];
let profile = null;
let idToken = null;

console.log("APP JS LOADED");

async function init() {

    await liff.init({
        liffId: "2009933896-IKoH3PQY"
    });

    if (!liff.isLoggedIn()) {
        liff.login();
        return;
    }

    profile = await liff.getProfile();
    idToken = liff.getIDToken();

    await loadCategories();
    await loadBudget();   
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

        const res = await fetch(
            "https://line-bot-on-render-combine-one-singapore.onrender.com/api/budget",
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${idToken}`
                }
            }
        );

        if (!res.ok) {
            throw new Error(`載入預算失敗：HTTP ${res.status}`);
        }

        const data = await res.json();

        // 取得已儲存的預算；沒有資料時使用空物件
        const budgets = data.budgets || {};

        // 將金額填入對應分類
        categories.forEach(c => {

            const input = document.getElementById(c.categories);

            if (!input) return;

            const amount = Number(budgets[c.categories]) || 0;

            input.value = amount.toLocaleString();

        });

        // 更新收入、支出及結餘總額
        updateTotal();

    } catch (error) {

        console.error("載入預算錯誤：", error);

        document.getElementById("status").innerText =
            "預算載入失敗，請重新整理頁面";

    }

}






//========================
// 更新收入、支出總額
//========================
function updateTotal() {

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