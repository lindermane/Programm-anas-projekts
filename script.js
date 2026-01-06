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
let allocationTemplate = {};
let unallocatedFunds = 0;
let actionHistory = [];

let balanceChartInstance = null;
let incomeExpenseChartInstance = null;

const colorPalettes = {
    default: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'],
    pastel: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFD9BA', '#E0BBE4', '#FEC8D8', '#D4F1F4'],
    vibrant: ['#FF0080', '#FF8C00', '#FFD700', '#00FF00', '#00CED1', '#9370DB', '#FF1493', '#FF4500'],
    earth: ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#BC8F8F', '#A0522D', '#D2B48C'],
    ocean: ['#006994', '#1E90FF', '#4169E1', '#0077BE', '#40E0D0', '#00CED1', '#5F9EA0', '#4682B4'],
    sunset: ['#FF6B6B', '#FFA07A', '#FFD93D', '#FF8243', '#C73E1D', '#E94B3C', '#F4A261', '#E76F51']
};

let currentPalette = 'default';

//
let pendingRemovalCategory = null;
let pendingRemovalGoalIndex = null;
let pendingRemovalAmount = 0;
let pendingRemovalType = null;
let removeModalInstance = null;

// Sidebar Function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarNav');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// Load data from localStorage
function loadData() {
    if (localStorage.getItem('categories')) categories = JSON.parse(localStorage.getItem('categories'));
    if (localStorage.getItem('goals')) {
        const loadedGoals = JSON.parse(localStorage.getItem('goals'));
        goals = Array.isArray(loadedGoals) ? loadedGoals : [];
    } else {
        goals = [];
    }
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

    if (localStorage.getItem('colorPalette')) {
        currentPalette = localStorage.getItem('colorPalette');
        const select = document.getElementById('paletteSelect');
        if (select) {
            select.value = currentPalette;
        }
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
        type: type,
        description: description,
        amount: amount,
        category: category,
        date: new Date().toISOString()
    };
    actionHistory.unshift(action); // beginning
    saveData();
}

// Update UI
function updateDisplay() {
    const unallocatedDisplay = document.getElementById('unallocatedDisplay');
    if (unallocatedDisplay) {
        unallocatedDisplay.value = unallocatedFunds.toFixed(2);
    }
    const unallocatedDisplayGoals = document.getElementById('unallocatedDisplayGoals');
    if (unallocatedDisplayGoals) {
        unallocatedDisplayGoals.value = unallocatedFunds.toFixed(2);
    }
    // adjust sum and removing categories
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

    // Regen allocation form
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

    setupAllocationForm();

    // Update goals list
    const goalListElement = document.getElementById('goalList');
    if (goalListElement) {
        if (!Array.isArray(goals)) {
            goals = [];
        }
        goalListElement.innerHTML = goals.map((goal, index) => `
        <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${goal.name}: ${goal.current.toFixed(2)} / ${goal.target.toFixed(2)}</span>
                <div class="d-flex align-items-center">
                    <input type="number" step="0.01" class="form-control form-control-sm me-1" id="adjust-goal-${index}" placeholder="Amount" style="width: 100px;">
                    <button class="btn btn-sm btn-danger me-1" onclick="adjustGoal(${index}, false)">-</button>
                    <button class="btn btn-sm btn-success me-1" onclick="adjustGoal(${index}, true)">+</button>
                    <button class="btn btn-sm btn-warning" onclick="removeGoal(${index})">Remove</button>
                </div>
            </div>
        `).join('');
    }
    updateHistoryDisplay();

    updateChart();
}

function updateHistoryDisplay() { // History display
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
    
    // Check if trying to edit income, warning
    if (action.type === 'income') {
        const hasExpenses = actionHistory.some(a => a && a.type === 'expense');
        if (hasExpenses) {
            alert('Cannot edit income entry. There are spending actions in the history that depend on this income.');
            return;
        }
    }
    
    const newAmount = parseFloat(document.getElementById(`edit-history-${actionId}`).value);
    if (isNaN(newAmount)) {
        alert('Please enter a valid amount.');
        return;
    }
    
    const oldAmount = action.amount;
    const difference = newAmount - oldAmount;
    
    // Update the budget based on action
    switch(action.type) {
        case 'income':
            // Reverse old alloc, apply new
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
            // Check if unalloc affected 
            if (action.description.includes('from unallocated funds')) {
                categories[action.category] = categories[action.category] + difference;
                unallocatedFunds = unallocatedFunds - difference;
            } else if (action.description.includes('to unallocated funds')) {
                categories[action.category] = categories[action.category] + difference;
                unallocatedFunds = unallocatedFunds - difference;
            } else {
                categories[action.category] = categories[action.category] - difference;
            }
            break;
        case 'goal':
            const goalIndex = goals.findIndex(g => g.name === action.category);
            if (goalIndex >= 0) {
                // Check if goal action affected unalloc
                if (action.description.includes('from unallocated funds')) {
                    goals[goalIndex].current = goals[goalIndex].current + difference;
                    unallocatedFunds = unallocatedFunds - difference;
                } else if (action.description.includes('to unallocated funds')) {
                    goals[goalIndex].current = goals[goalIndex].current + difference;
                    unallocatedFunds = unallocatedFunds - difference;
                } else {
                    goals[goalIndex].current = goals[goalIndex].current - difference;
                }
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
    const actionIndex = actionHistory.findIndex(a => a.id === actionId);
    if (actionIndex === -1) return;
    
    const action = actionHistory[actionIndex];
    
    // Check if trying to delete income, there are expenses
    if (action.type === 'income') {
        const hasExpenses = actionHistory.some(a => a && a.type === 'expense');
        if (hasExpenses) {
            alert('Cannot delete income entry. There are spending actions in the history that depend on this income.');
            return;
        }
    }
    
    if (!confirm('Are you sure you want to delete this action? This will reverse its effect on your budget.')) {
        return;
    }
    
    // Reverse
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
            // Check if unalloc affected
            if (action.description.includes('from unallocated funds')) {
                categories[action.category] -= action.amount;
                unallocatedFunds += action.amount;
            } else if (action.description.includes('to unallocated funds')) {
                categories[action.category] += Math.abs(action.amount);
                unallocatedFunds -= Math.abs(action.amount);
            } else {
                categories[action.category] -= action.amount;
            }
            break;
        case 'goal':
            const goalIndex = goals.findIndex(g => g.name === action.category);
            if (goalIndex >= 0) {
                // Check
                if (action.description.includes('from unallocated funds')) {
                    goals[goalIndex].current -= action.amount;
                    unallocatedFunds += action.amount;
                } else if (action.description.includes('to unallocated funds')) {
                    goals[goalIndex].current += Math.abs(action.amount);
                    unallocatedFunds -= Math.abs(action.amount);
                } else {
                    goals[goalIndex].current -= action.amount;
                }
            }
            break;
    }
    
    actionHistory.splice(actionIndex, 1);
    saveData();
    updateDisplay();
}

function clearHistory() {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) {
        return;
    }
    actionHistory = [];
    saveData();
    updateDisplay();
}

// adjust category sum manual
function adjustSumManual(cat, isAdd) {
    const input = document.getElementById(`adjust-${cat}`);
    const amount = parseFloat(input.value);
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
        input.value = '' //Clear
        saveData();
        updateDisplay();
    }
    //Remove money from cat - use modal
    else {
        if (categories[cat] < amount) {
            alert(`Insufficient funds in ${cat}! Available: $${categories[cat].toFixed(2)}`)
            return;
        }
        
        // Store pending action data and show modal
        pendingRemovalCategory = cat;
        pendingRemovalGoalIndex = null;
        pendingRemovalAmount = amount;
        pendingRemovalType = 'category';
        
        document.getElementById('modalCategoryName').textContent = cat;
        document.getElementById('modalCategoryName2').textContent = cat;
        document.getElementById('modalAmount').textContent = amount.toFixed(2);
        
        removeModalInstance = new bootstrap.Modal(document.getElementById('removeModal'));
        removeModalInstance.show();
    }
}

function handleRemoveAction(action) {
    if ((!pendingRemovalCategory && pendingRemovalGoalIndex == null) || !pendingRemovalAmount) {
        if (removeModalInstance) {
            removeModalInstance.hide();
        }
        return;
    }
    
    const amount = pendingRemovalAmount;
    let input = null;
    
    if (pendingRemovalType === 'goal' && pendingRemovalGoalIndex != null) {
        const goalIndex = pendingRemovalGoalIndex;
        const goalName = goals[goalIndex].name;
        input = document.getElementById(`adjust-goal-${goalIndex}`);
        
        if (action === 'allocate') {
            // Move to unalloc
            goals[goalIndex].current -= amount;
            unallocatedFunds += amount;
            addActionToHistory('goal', `Moved $${amount.toFixed(2)} from goal to unallocated funds`, -amount, goalName);
        } else if (action === 'remove') {
            // Remove
            goals[goalIndex].current -= amount;
            addActionToHistory('goal', `Removed $${amount.toFixed(2)} completely from goal`, -amount, goalName);
        } else if (action === 'spent') {
            // Record as expense
            goals[goalIndex].current -= amount;
            addActionToHistory('expense', `Expense: $${amount.toFixed(2)}`, amount, goalName);
            // Also add to expenses array
            expenses.push({ amount, category: goalName, date: new Date().toISOString().split('T')[0], interval: 0 });
        }
    } else if (pendingRemovalType === 'category' && pendingRemovalCategory) {
        const cat = pendingRemovalCategory;
        input = document.getElementById(`adjust-${cat}`);
        
        if (action === 'allocate') {
            // Move to unalloc
            categories[cat] -= amount;
            unallocatedFunds += amount;
            addActionToHistory('adjustment', `Moved $${amount.toFixed(2)} to unallocated funds`, -amount, cat);
        } else if (action === 'remove') {
            // Remove
            categories[cat] -= amount;
            addActionToHistory('adjustment', `Removed $${amount.toFixed(2)} completely`, -amount, cat);
        } else if (action === 'spent') {
            // Record as expense
            categories[cat] -= amount;
            addActionToHistory('expense', `Expense: $${amount.toFixed(2)}`, amount, cat);
            // Also add to expenses array for consistency
            expenses.push({ amount, category: cat, date: new Date().toISOString().split('T')[0], interval: 0 });
        }
    }
    
    if (input) input.value = ''; //Clear
    saveData();
    updateDisplay();
    
    // Reset data, close modal
    pendingRemovalCategory = null;
    pendingRemovalGoalIndex = null;
    pendingRemovalAmount = 0;
    pendingRemovalType = null;
    removeModalInstance.hide();
}

// remove cat
function removeCategory(cat) {
    delete categories[cat];
    delete allocationTemplate[cat];
    saveData();
    updateDisplay();
}

// adjust goal amount
function adjustGoal(index, isAdd) {
    const input = document.getElementById(`adjust-goal-${index}`);
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount <= 0) {
        alert('Lūdzu ievadi derīgu pozitīvu summu');
        return;
    }
    
    // Add money to goal
    if (isAdd) {
        if (unallocatedFunds < amount) {
            alert(`Insufficient unallocated funds! Available: $${unallocatedFunds.toFixed(2)}`);
            return;
        }
        // from unalloc to goal
        unallocatedFunds -= amount;
        goals[index].current += amount;
        addActionToHistory('goal', `Added $${amount.toFixed(2)} from unallocated funds`, amount, goals[index].name);
        input.value = '';
        saveData();
        updateDisplay();
    }
    // Remove money from goal
    else {
        if (goals[index].current < amount) {
            alert(`Insufficient funds in ${goals[index].name}! Available: $${goals[index].current.toFixed(2)}`);
            return;
        }
        
        pendingRemovalGoalIndex = index;
        pendingRemovalCategory = null;
        pendingRemovalAmount = amount;
        pendingRemovalType = 'goal';
        
        document.getElementById('modalCategoryName').textContent = goals[index].name;
        document.getElementById('modalCategoryName2').textContent = goals[index].name;
        document.getElementById('modalAmount').textContent = amount.toFixed(2);
        
        removeModalInstance = new bootstrap.Modal(document.getElementById('removeModal'));
        removeModalInstance.show();
    }
}

// remove goal
function removeGoal(index) {
    if (index < 0 || index >= goals.length) {
        return;
    }
    
    const goal = goals[index];
    const goalName = goal.name;
    const goalCurrent = goal.current;
    const goalTarget = goal.target;
    
    if (!confirm(`Are you sure you want to delete the goal "${goalName}"?`)) {
        return;
    }
    
    // Handle money in the goal
    if (goalCurrent > 0) {
        // If goal sum is met, log as expense
        if (goalCurrent >= goalTarget) {
            // log as expense
            addActionToHistory('expense', `Goal completed and removed: $${goalCurrent.toFixed(2)}`, goalCurrent, goalName);
            // add to expenses array for consistency
            expenses.push({ amount: goalCurrent, category: goalName, date: new Date().toISOString().split('T')[0], interval: 0 });
        } else {
            // Goal not met, unalloc funds
            unallocatedFunds += goalCurrent;
            addActionToHistory('goal', `Removed goal "${goalName}" - $${goalCurrent.toFixed(2)} returned to unallocated funds`, -goalCurrent, goalName);
        }
    }
    
    goals.splice(index, 1);
    saveData();
    updateDisplay();
}

// setup alloc
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

// update unalloc
function updateUnallocatedFunds() {
    const unallocatedDisplay = document.getElementById('unallocatedDisplay');
    const unallocatedDisplayGoals = document.getElementById('unallocatedDisplayGoals');
    
    const newValue = parseFloat(unallocatedDisplay ? unallocatedDisplay.value : unallocatedDisplayGoals.value);
    
    if (isNaN(newValue)) {
        if (unallocatedDisplay) unallocatedDisplay.value = unallocatedFunds.toFixed(2);
        if (unallocatedDisplayGoals) unallocatedDisplayGoals.value = unallocatedFunds.toFixed(2);
        alert('Please enter a valid number.');
        return;
    }
    
    const oldValue = unallocatedFunds;
    const difference = newValue - oldValue;
    
    if (difference === 0) {
        if (unallocatedDisplay) unallocatedDisplay.value = unallocatedFunds.toFixed(2);
        if (unallocatedDisplayGoals) unallocatedDisplayGoals.value = unallocatedFunds.toFixed(2);
        return;
    }
    
    unallocatedFunds = newValue;
    
    // history
    if (difference > 0) {
        addActionToHistory('adjustment', `Added $${difference.toFixed(2)} to unallocated funds`, difference, 'Unallocated Funds');
    } else {
        addActionToHistory('adjustment', `Removed $${Math.abs(difference).toFixed(2)} from unallocated funds`, difference, 'Unallocated Funds');
    }
    
    // Sync both inputs
    if (unallocatedDisplay) unallocatedDisplay.value = unallocatedFunds.toFixed(2);
    if (unallocatedDisplayGoals) unallocatedDisplayGoals.value = unallocatedFunds.toFixed(2);
    
    saveData();
    updateDisplay();
}

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
    // Check
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded');
        return;
    }

    const colors = colorPalettes[currentPalette];
    const incomeExpenseColors = currentPalette === 'default' 
        ? ['#4BC0C0', '#FF6384'] 
        : [colors[3], colors[0]];
    
    // Doughnut Chart
    const balanceCanvas = document.getElementById('balanceChart');
    if (!balanceCanvas) {
        console.warn('balanceChart canvas not found');
        return;
    }
    
    try {
        const ctx = balanceCanvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2d context for balanceChart');
            return;
        }
        
        if (balanceChartInstance) {
            balanceChartInstance.destroy();
        }
        
        const categoryLabels = Object.keys(categories);
        const categoryValues = Object.values(categories);
        
        balanceChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryLabels,
                datasets: [{
                    data: categoryValues,
                    backgroundColor: colors.slice(0, categoryLabels.length),
                    borderColor: colors.slice(0, categoryLabels.length),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Category Balance'
                    }
                },
                cutout: '60%'
            }
        });
    } catch (error) {
        console.error('Error creating balance chart:', error);
    }

    // Income vs Expenses Doughnut Chart
    const incomeExpenseCanvas = document.getElementById('incomeExpenseChart');
    if (!incomeExpenseCanvas) {
        console.warn('incomeExpenseChart canvas not found');
        return;
    }
    
    try {
        const ctx2 = incomeExpenseCanvas.getContext('2d');
        if (!ctx2) {
            console.error('Could not get 2d context for incomeExpenseChart');
            return;
        }
        
        if (incomeExpenseChartInstance) {
            incomeExpenseChartInstance.destroy();
        }
        
        // Only count income and expenses
        const totalIncome = actionHistory
            .filter(a => a && a.type === 'income')
            .reduce((sum, a) => sum + (a.amount || 0), 0);
        
        const totalExpenses = actionHistory
            .filter(a => a && a.type === 'expense')
            .reduce((sum, a) => sum + (a.amount || 0), 0);
        
        // Always show chart
        incomeExpenseChartInstance = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    data: [totalIncome || 0, totalExpenses || 0],
                    backgroundColor: incomeExpenseColors,
                    borderColor: incomeExpenseColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    title: {
                        display: true,
                        text: 'Income vs Expenses'
                    }
                },
                cutout: '60%'
            }
        });
    } catch (error) {
        console.error('Error creating income/expense chart:', error);
    }
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

// change palette
function changeColorPalette() {
    const select = document.getElementById('paletteSelect');
    currentPalette = select.value;
    localStorage.setItem('colorPalette', currentPalette);
    updateChart();
}

// Load on start - wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
} else {
    loadData();
}