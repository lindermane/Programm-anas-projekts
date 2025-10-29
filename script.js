// Data storage
let categories = {
    Transport: 0,
    Food: 0,
    Entertainment: 0,
    Personal: 0,
    Savings: 0,
    Bills: 0
};
let goals = [];
let expenses = [];
let allocationTemplate = { Transport: 0.1, Food: 0.2, Entertainment: 0.1, Personal: 0.2, Savings: 0.2, Bills: 0.2 }; // Example: 10% to Transport, etc.

// Load data from localStorage
function loadData() {
    if (localStorage.getItem('categories')) categories = JSON.parse(localStorage.getItem('categories'));
    if (localStorage.getItem('goals')) goals = JSON.parse(localStorage.getItem('goals'));
    if (localStorage.getItem('expenses')) expenses = JSON.parse(localStorage.getItem('expenses'));
    updateDisplay();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

// Update UI
function updateDisplay() {
    document.getElementById('categoryList').innerHTML = Object.keys(categories).map(cat => `<p>${cat}: $${categories[cat].toFixed(2)}</p>`).join('');
    document.getElementById('goalList').innerHTML = goals.map(goal => `<p>${goal.name}: $${goal.current.toFixed(2)} / $${goal.target.toFixed(2)}</p>`).join('');
    updateChart();
    checkReminders();
}

// Income form
document.getElementById('incomeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    // Auto-allocate
    Object.keys(allocationTemplate).forEach(cat => {
        categories[cat] += amount * allocationTemplate[cat];
    });
    saveData();
    updateDisplay();
    alert('Income added and allocated!');
});

// Expense form
document.getElementById('expenseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const interval = parseInt(document.getElementById('recurringInterval').value);

    if (categories[category] < amount) {
        const borrowFrom = prompt('Insufficient funds. Borrow from which category?');
        if (borrowFrom && categories[borrowFrom] >= amount) {
            categories[borrowFrom] -= amount;
            categories[category] += amount;
        } else {
            alert('Cannot borrow.');
            return;
        }
    }
    categories[category] -= amount;
    expenses.push({ amount, category, date, interval });
    saveData();
    updateDisplay();
});

// Transfer funds
function transferFunds() {
    const from = prompt('From category:');
    const to = prompt('To category:');
    const amt = parseFloat(prompt('Amount:'));
    if (categories[from] >= amt) {
        categories[from] -= amt;
        categories[to] += amt;
        saveData();
        updateDisplay();
    } else {
        alert('Insufficient funds.');
    }
}

// Goal form
document.getElementById('goalForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('goalName').value;
    const target = parseFloat(document.getElementById('goalAmount').value);
    goals.push({ name, target, current: 0 });
    saveData();
    updateDisplay();
});

// Chart
function updateChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
            }]
        }
    });
}

// Reminders
function checkReminders() {
    const today = new Date();
    expenses.forEach(exp => {
        if (exp.interval > 0) {
            const expDate = new Date(exp.date);
            const diff = (today - expDate) / (1000 * 60 * 60 * 24);
            if (diff % exp.interval < 3) { // Due soon
                alert(`Reminder: ${exp.category} expense due soon!`);
            }
        }
    });
}

// Currency converter (simple, assumes rates; in real app, use API)
document.getElementById('currencyForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('convertAmount').value);
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrency').value;
    // Mock conversion (replace with API call)
    const rate = 0.85; // Example USD to EUR
    const result = amount * rate;
    document.getElementById('conversionResult').innerHTML = `<p>${amount} ${from} = ${result.toFixed(2)} ${to}</p>`;
});

// Load on start
loadData();