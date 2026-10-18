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