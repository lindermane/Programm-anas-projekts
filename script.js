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
let allocationTemplate = {}; // Example: 10% to Transport, etc.
let unallocatedFunds = 0;

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
        allocationTemplate = { Transport: 0.1, Food: 0.2, Entertainment: 0.1, Personal: 0.2, Savings: 0.2, Bills: 0.2 };
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
}

// Update UI
function updateDisplay() {
    // Buttons for adjusting sums and removing categories
    document.getElementById('categoryList').innerHTML = Object.keys(categories).map(cat => `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span>${cat}: $${categories[cat].toFixed(2)}</span>
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
    `.join('');

    updateChart();
    checkReminders();
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
    categories[cat] += isAdd ? amount : -amount;
    input.value = ''; //Clear input after adjustment
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
    goals[index].current += isAdd ? amount : -amount;
    if (goals[index].current < 0) goals[index].current = 0; // Prevent negative
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
// // Function to populate the allocation form (assuming you add a form with inputs like id="transportAlloc", etc.)
// function populateAllocationForm() {
//     Object.keys(allocationTemplate).forEach(cat => {
//         const inputId = cat.toLowerCase() + 'Alloc'; // e.g., transportAlloc
//         if (document.getElementById(inputId)) {
//             document.getElementById(inputId).value = (allocationTemplate[cat] * 100).toFixed(1); // Show as percentage
//         }
//     });
// }
// // Allocation Template form (new addition)
// document.getElementById('allocationForm').addEventListener('submit', function(e) {
//     e.preventDefault();
//     let total = 0;
//     Object.keys(categories).forEach(cat => {
//         const inputId = cat.toLowerCase() + 'Alloc';
//         const percent = parseFloat(document.getElementById(inputId).value) / 100;
//         allocationTemplate[cat] = percent;
//         total += percent;
//     });
//     if (Math.abs(total - 1.0) > 0.01) { // Allow small tolerance
//         alert('Percentages must sum to 100%. Current sum: ' + (total * 100).toFixed(1) + '%');
//         return;
//     }
//     saveData();
//     updateDisplay();
//     alert('Allocation template updated!');
// });
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
        if (Math.abs(total - 1.0) > 0.01) { // Allow small tolerance
            alert('Percentages must sum to 100%. Current sum: ' + (total * 100).toFixed(1) + '%');
            return;
        }
        saveData();
        updateDisplay();
        alert('Allocation template updated!');
    });
}

// Income form-----------------------------------------------------------------------
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