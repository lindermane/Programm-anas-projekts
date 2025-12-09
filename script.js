// Data storage
let categories = {
    Transport: 0,
    Food: 0,
    Entertainment: 0,
    Personal: 0,
    Bills: 0
};
let goals = [];
let expenses = [];
let allocationTemplate = {}; // Example: 10% to Transport, etc.
let unallocatedFunds = 0;
let actionHistory = [];

let balanceChartInstance = null;
let incomeExpenseChartInstance = null; // Chart references

// Load data from localStorage
function loadData() {
    if (localStorage.getItem('categories')) categories = JSON.parse(localStorage.getItem('categories'));
    if (localStorage.getItem('goals')) goals = JSON.parse(localStorage.getItem('goals'));
    if (localStorage.getItem('expenses')) expenses = JSON.parse(localStorage.getItem('expenses'));
    if (localStorage.getItem('unallocatedFunds')) unallocatedFunds = parseFloat(localStorage.getItem('unallocatedFunds'));
    if (localStorage.getItem('allocationTemplate')) {
        allocationTemplate = JSON.parse(localStorage.getItem('allocationTemplate'));
    } else {
        // Default template if none saved
        allocationTemplate = { Transport: 0.1, Food: 0.2, Entertainment: 0.1, Personal: 0.2, Bills: 0.4 };
    }
    if (localStorage.getItem('actionHistory')) {
        actionHistory = JSON.parse(localStorage.getItem('actionHistory'))
    }
    updateDisplay();
    setupAllocationForm();
}


// Save data to localStorage
function saveData() {
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('goals', JSON.stringify(goals));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('unallocatedFunds', unallocatedFunds.toString());
    localStorage.setItem('allocationTemplate', JSON.stringify(allocationTemplate));
    localStorage.setItem('actionHistory', JSON.stringify(actionHistory));
}

function addActionToHistory(type, description, amount, category = '') {
    const action = {
        id: Date.now(),
        type: type, // 'income', 'expense', 'adjustment', 'transfer', 'goal'
        description: description,
        amount: amount,
        category: category,
        date: new Date().toISOString()
    };
    actionHistory.unshift(action); // Add to beginning
    saveData();
}

// Update UI
function updateDisplay() {
    document.getElementById('unallocatedDisplay').textContent = unallocatedFunds.toFixed(2)
    // Buttons for adjusting sums and removing categories
    document.getElementById('categoryList').innerHTML = Object.keys(categories).map(cat => `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span>${cat}: ${categories[cat].toFixed(2)}</span>
            <div class="d-flex align-items-center">
                <input type="number" step="0.01" class="form-control form-control-sm me-1" id="adjust-${cat}" placeholder="Amount" style="width: 100px;">
                <button class="btn btn-sm btn-danger me-1" onclick="adjustSumManual('${cat}', false)">-</button>
                <button class="btn btn-sm btn-success me-1" onclick="adjustSumManual('${cat}', true)">+</button>
                <button class="btn btn-sm btn-warning" onclick="removeCategory('${cat}')">Remove</button>
            </div>
        </div>
    `).join('');

    // Update expense category select
    const select = document.getElementById('expenseCategory');
    select.innerHTML = Object.keys(categories).map(cat => `<option value="${cat}">${cat}</option>`).join('');

    // Regenerate allocation form dynamically
    const allocContainer = document.getElementById('allocationContainer');
    allocContainer.innerHTML = `
        <form id="allocationForm">
            <div class="row">
                ${Object.keys(categories).map(cat => `
                    <div class="col-md-4 mb-3">
                        <label for="${cat.toLowerCase()}Alloc" class="form-label">${cat} %</label>
                        <input type="number" step="0.1" min="0" max="100" class="form-control" id="${cat.toLowerCase()}Alloc" value="${(allocationTemplate[cat] || 0) * 100}" required>
                    </div>
                `).join('')}
            </div>
            <button type="submit" class="btn btn-primary">Update Allocation</button>
        </form>
    `;

    // Re-setup the allocation form listener after regeneration
    setupAllocationForm();

    document.getElementById('goalList').innerHTML = goals.map((goal, index) => `
    <div class="d-flex justify-content-between align-items-center mb-2">
            <span>${goal.name}: ${goal.current.toFixed(2)} / ${goal.target.toFixed(2)}</span>
            <div class="d-flex align-items-center">
                <input type="number" step="0.01" class="form-control form-control-sm me-1" id="adjust-goal-${index}" placeholder="Amount" style="width: 100px;">
                <button class="btn btn-sm btn-danger me-1" onclick="adjustGoal(${index}, false)">-</button>
                <button class="btn btn-sm btn-success me-1" onclick="adjustGoal(${index}, true)">+</button>
                <button class="btn btn-sm btn-warning" onclick="removeGoal(${index})">Remove</button>
            </div>
        </div>
    `.join(''));
    updateHistoryDisplay();

    updateChart();
    checkReminders();
}

function updateHistoryDisplay() { // History display function
    const historyContainer = document.getElementById('historyList');
    if (actionHistory.length === 0) {
        historyContainer.innerHTML = '<p class="text-muted">No actions yet.</p>';
        return;
    }
    
    historyContainer.innerHTML = actionHistory.map((action, index) => {
        const date = new Date(action.date);
        const dateStr = date.toLocaleString();
        let badgeClass = '';
        let sign = '';
        
        switch(action.type) {
            case 'income':
                badgeClass = 'bg-success';
                sign = '+';
                break;
            case 'expense':
                badgeClass = 'bg-danger';
                sign = '-';
                break;
            case 'adjustment':
                badgeClass = action.amount >= 0 ? 'bg-success' : 'bg-danger';
                sign = action.amount >= 0 ? '+' : '';
                break;
            case 'transfer':
                badgeClass = 'bg-info';
                sign = '';
                break;
            case 'goal':
                badgeClass = 'bg-warning';
                sign = action.amount >= 0 ? '+' : '';
                break;
        }
        
        return `
            <div class="history-item card mb-2">
                <div class="card-body p-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <span class="badge ${badgeClass}">${action.type.toUpperCase()}</span>
                            <span class="ms-2">${action.description}</span>
                            ${action.category ? `<span class="badge bg-secondary ms-2">${action.category}</span>` : ''}
                        </div>
                        <div class="d-flex align-items-center">
                            <strong class="me-3">${sign}$${Math.abs(action.amount).toFixed(2)}</strong>
                            <input type="number" step="0.01" class="form-control form-control-sm me-1" id="edit-history-${action.id}" value="${action.amount}" style="width: 100px;">
                            <button class="btn btn-sm btn-primary me-1" onclick="editHistoryAction(${action.id})">Update</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteHistoryAction(${action.id})">Delete</button>
                        </div>
                    </div>
                    <small class="text-muted">${dateStr}</small>
                </div>
            </div>
        `;
    }).join('');
}

function editHistoryAction(actionId) { // Edit History
    const action = actionHistory.find(a => a.id === actionId);
    if (!action) return;
    
    const newAmount = parseFloat(document.getElementById(`edit-history-${actionId}`).value);
    if (isNaN(newAmount)) {
        alert('Please enter a valid amount.');
        return;
    }
    
    const oldAmount = action.amount;
    const difference = newAmount - oldAmount;
    
    // Update the budget based on action type
    switch(action.type) {
        case 'income':
            // Reverse old allocation and apply new
            Object.keys(allocationTemplate).forEach(cat => {
                categories[cat] = categories[cat] - (oldAmount * allocationTemplate[cat]) + (newAmount * allocationTemplate[cat]);
            });
            let totalAlloc = Object.values(allocationTemplate).reduce((sum, val) => sum + val, 0);
            unallocatedFunds = unallocatedFunds - (oldAmount * (1 - totalAlloc)) + (newAmount * (1 - totalAlloc));
            break;
        case 'expense':
            categories[action.category] = categories[action.category] + oldAmount - newAmount;
            break;
        case 'adjustment':
            categories[action.category] = categories[action.category] - difference;
            break;
        case 'goal':
            const goalIndex = goals.findIndex(g => g.name === action.category);
            if (goalIndex >= 0) {
                goals[goalIndex].current = goals[goalIndex].current - difference;
            }
            break;
    }
    
    action.amount = newAmount;
    action.description = action.description.replace(/\$[\d.]+/, `$${newAmount.toFixed(2)}`);
    
    saveData();
    updateDisplay();
    alert('History action updated!');
}

function deleteHistoryAction(actionId) { //Delete history
    if (!confirm('Are you sure you want to delete this action? This will reverse its effect on your budget.')) {
        return;
    }
    
    const actionIndex = actionHistory.findIndex(a => a.id === actionId);
    if (actionIndex === -1) return;
    
    const action = actionHistory[actionIndex];
    
    // Reverse the action's effect
    switch(action.type) {
        case 'income':
            Object.keys(allocationTemplate).forEach(cat => {
                categories[cat] -= action.amount * allocationTemplate[cat];
            });
            let totalAlloc = Object.values(allocationTemplate).reduce((sum, val) => sum + val, 0);
            unallocatedFunds -= action.amount * (1 - totalAlloc);
            break;
        case 'expense':
            categories[action.category] += action.amount;
            break;
        case 'adjustment':
            categories[action.category] -= action.amount;
            break;
        case 'goal':
            const goalIndex = goals.findIndex(g => g.name === action.category);
            if (goalIndex >= 0) {
                goals[goalIndex].current -= action.amount;
            }
            break;
    }
    
    actionHistory.splice(actionIndex, 1);
    saveData();
    updateDisplay();
}

function clearHistory() { //Clear history
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        return;
    }
    actionHistory = [];
    saveData();
    updateDisplay();
}

// Function to adjust category sum manual
function adjustSumManual(cat, isAdd) {
    const input = document.getElementById(`adjust-${cat}`);
    const amount = parseFloat(input.value);
    console.log('Amount from input:', amount, 'isAdd:', isAdd) //Debug
    if (isNaN(amount) || amount <= 0) {
        alert('Lūdzu ievadi derīgu pozitīvu summu');
        return;
    }
    // Add money to cat
    if (isAdd) {
        if (unallocatedFunds < amount) {
            alert(`Insufficient unallocated funds! Available: $${unallocatedFunds.toFixed(2)}`);
            return
        }
        // Move from unalloc to cat
        unallocatedFunds -= amount
        categories[cat] += amount
        addActionToHistory('adjustment', `Added $${amount.toFixed(2)} from unallocated funds`, amount, cat)
    }
    //Remove money from cat
    else {
        if (categories[cat] < amount) {
            alert(`Insufficient funds in ${cat}! Available: $${categories[cat].toFixed(2)}`)
            return;
        }
        //Ask user
        const action = confirm(`Remove $${amount.toFixed(2)} from ${cat}.\n\nClick OK to move to Unallocated Funds\nClick Cancel to remove completely from budget`)
        
        if (action) {
            // Move to unallocated funds
            categories[cat] -= amount;
            unallocatedFunds += amount;
            addActionToHistory('adjustment', `Moved $${amount.toFixed(2)} to unallocated funds`, -amount, cat);
        } else {
            // Remove completely
            categories[cat] -= amount;
            addActionToHistory('adjustment', `Removed $${amount.toFixed(2)} completely`, -amount, cat);
        }
    }
    
    input.value = '' //Clear
    saveData();
    updateDisplay();
}

// Function to remove category
function removeCategory(cat) {
    delete categories[cat];
    delete allocationTemplate[cat];
    saveData();
    updateDisplay();
}

// Function to adjust goal amount
function adjustGoal(index, isAdd) {
    const input = document.getElementById(`adjust-goal-${index}`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Lūdzu ievadi derīgu pozitīvu summu.');
        return;
    }
    
    const adjustAmount = isAdd ? amount : -amount;
    goals[index].current += adjustAmount;
    if (goals[index].current < 0) goals[index].current = 0; // Prevent negative
    
    addActionToHistory('goal', `${isAdd ? 'Added to' : 'Removed from'} goal: ${goals[index].name}`, adjustAmount, goals[index].name);
    input.value = '';
    saveData();
    updateDisplay();
}

// Function to remove goal
function removeGoal(index) {
    goals.splice(index, 1);
    saveData();
    updateDisplay();
}

// Function to setup allocation form listener
function setupAllocationForm() {
    document.getElementById('allocationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        let total = 0;
        Object.keys(categories).forEach(cat => {
            const inputId = cat.toLowerCase() + 'Alloc';
            const percent = parseFloat(document.getElementById(inputId).value) / 100;
            allocationTemplate[cat] = percent;
            total += percent;
        });
        if (total > 1.0) {
            alert('Percentages cannot exceed 100%. Current sum: ' + (total * 100).toFixed(1) + '%');
            return;
        }
        // if (Math.abs(total - 1.0) > 0.01) { // Allow small tolerance
        //     alert('Percentages must sum to 100%. Current sum: ' + (total * 100).toFixed(1) + '%');
        //     return;
        // }
        saveData();
        updateDisplay();
        alert('Allocation template updated!' + ((1 - total) * 100).toFixed(1) + '% will go to unallocated funds.');
    });
}

// Income form
document.getElementById('incomeForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('incomeAmount').value);

    // Calc total alloc %
    let totalAllocation = 0;
    Object.keys(allocationTemplate).forEach(cat => {
        totalAllocation += allocationTemplate[cat];
    });

    // Funds to cat
    Object.keys(allocationTemplate).forEach(cat => {
        categories[cat] += amount * allocationTemplate[cat];
    });

    // Remainder in unallocated funds when alloc < 100%
    if (totalAllocation < 1.0) {
        unallocatedFunds += amount * (1.0 - totalAllocation);
    }

    addActionToHistory('income', `Income added: $${amount.toFixed(2)}`, amount)

    saveData();
    updateDisplay();
    alert('Income added and allocated!');
    document.getElementById('incomeAmount').value = 0; // Clear input
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
    addActionToHistory('expense', `Expense: $${amount.toFixed(2)}`, amount, category);
    saveData();
    updateDisplay();
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseDate').value = '';
    document.getElementById('recurringInterval').value = 0;
});

// Transfer funds
function transferFunds() {
    const from = prompt('From category:');
    const to = prompt('To category:');
    const amt = parseFloat(prompt('Amount:'));
    if (categories[from] >= amt) {
        categories[from] -= amt;
        categories[to] += amt;
        addActionToHistory('transfer', `Transfer from ${from} to ${to}`, amt, `${from} → ${to}`);
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

    document.getElementById('goalName').value = '';
    document.getElementById('goalAmount').value = '';
});

// Chart
function updateChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d'); // balance ch
    if (balanceChartInstance) {
        balanceChartInstance.destroy();
    }
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true
        }
    });

    // Income vs Expenses Chart
    const ctx2 = document.getElementById('incomeExpenseChart').getContext('2d');
    if (incomeExpenseChartInstance) {
        incomeExpenseChartInstance.destroy();
    }
    
    const totalIncome = actionHistory
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);
    
    const totalExpenses = actionHistory
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);
    
    incomeExpenseChartInstance = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses', 'Net'],
            datasets: [{
                label: 'Amount ($)',
                data: [totalIncome, totalExpenses, totalIncome - totalExpenses],
                backgroundColor: ['#4BC0C0', '#FF6384', '#36A2EB']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
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
    document.getElementById('convertAmount').value = '';
});

// Add category form
document.getElementById('addCategoryForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value.trim();
    if (name && !categories[name]) {
        categories[name] = 0;
        allocationTemplate[name] = 0;
        saveData();
        updateDisplay();
        document.getElementById('newCategoryName').value = '';
    } else {
        alert('Category name is invalid or already exists.');
    }
});

// Load on start
loadData();