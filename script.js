const taskInput = document.getElementById("taskInput");
const addTaskButton = document.getElementById("addTaskButton");
const taskList = document.getElementById("taskList");

let tasks = [];

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayDate() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}

function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// NEW: Function to check for new day and reset tasks
function checkAndResetTasks() {
    const lastCheckDate = localStorage.getItem('lastCheckDate');
    const today = getTodayDate();
    
    if (lastCheckDate !== today) {
        console.log("A new day has started. Tasks will be reset.");

        const yesterday = getYesterdayDate();
        tasks.forEach(task => {
            // Check if the task was completed or missed yesterday
            const wasDoneYesterday = task.history.some(entry => entry.date === yesterday);

            if (!wasDoneYesterday) {
                // If not done, add a 'pending' status
                task.history.push({
                    date: yesterday,
                    status: 'pending',
                    reason: 'Unaddressed'
                });
            }
            // Reset isCompleted status for the new day
            task.isCompleted = false;
        });

        localStorage.setItem('lastCheckDate', today);
        saveTasks();
    }
}

// UPDATED: RenderTask now handles pending status and disabled buttons
function renderTask(taskData) {
    const listItem = document.createElement("li");
    listItem.setAttribute("data-id", taskData.id);

    const today = getTodayDate();
    const wasMissedToday = taskData.history.some(entry => entry.date === today && entry.status === 'missed');
    const isPendingToday = taskData.history.some(entry => entry.date === today && entry.status === 'pending');
    
    const minusButtonText = wasMissedToday ? '+' : '-';

    listItem.innerHTML = `
        <input type="checkbox">
        <span class="task-text">${taskData.text}</span>
        ${isPendingToday ? `<span class="pending-mark">!</span>` : ''}
        <div class="task-stats"></div>
        <button class="minus-button">${minusButtonText}</button>
        <button class="delete-button">X</button>
    `;

    const checkbox = listItem.querySelector('input[type="checkbox"]');
    const taskTextSpan = listItem.querySelector('.task-text');
    const minusBtn = listItem.querySelector('.minus-button');
    const taskStatsDiv = listItem.querySelector('.task-stats');

    if (taskData.isCompleted) {
        checkbox.checked = true;
        taskTextSpan.classList.add('completed');
        minusBtn.disabled = true;
    }

    if (wasMissedToday) {
        checkbox.disabled = true;
        taskTextSpan.classList.add('missed');
    }

    if (isPendingToday) {
        checkbox.disabled = true;
        minusBtn.disabled = true;
    }
    
    taskList.appendChild(listItem);
    wireUpTask(listItem);
    calculateAndRenderStats(taskData, taskStatsDiv);
}

// NEW: Function to calculate and display stats
function calculateAndRenderStats(taskData, taskStatsDiv) {
    const completedDays = taskData.history.filter(entry => entry.status === 'completed').length;
    const missedDays = taskData.history.filter(entry => entry.status === 'missed').length;
    const pendingDays = taskData.history.filter(entry => entry.status === 'pending').length;
    const totalDays = completedDays + missedDays + pendingDays;

    let percentage = 0;
    if (totalDays > 0) {
        percentage = Math.round((completedDays / totalDays) * 100);
    }
    
    taskStatsDiv.innerHTML = `
        <p>${completedDays}C / ${missedDays}M / ${pendingDays}P | ${percentage}%</p>
    `;
}

// UPDATED: showTasks now calls the new check function
function showTasks() {
    checkAndResetTasks();
    taskList.innerHTML = "";
    const savedTasks = localStorage.getItem("tasks");
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        tasks.forEach(task => {
            renderTask(task);
        });
    }
}

// UPDATED: wireUpTask now handles pending status
function wireUpTask(listItem) {
    const checkbox = listItem.querySelector("input[type='checkbox']");
    const taskTextSpan = listItem.querySelector(".task-text");
    const minusBtn = listItem.querySelector(".minus-button");

    checkbox.addEventListener('change', function() {
        const taskId = listItem.getAttribute("data-id");
        const taskIndex = tasks.findIndex(task => task.id == taskId);
        
        if (taskIndex !== -1) {
            tasks[taskIndex].isCompleted = checkbox.checked;
            const today = getTodayDate();

            if (checkbox.checked) {
                // Remove any pending/missed status for today
                tasks[taskIndex].history = tasks[taskIndex].history.filter(entry => entry.date !== today);
                tasks[taskIndex].history.push({ date: today, status: 'completed' });
                taskTextSpan.classList.add("completed");
                taskTextSpan.classList.remove("missed");
                minusBtn.textContent = '-';
                minusBtn.disabled = true;
            } else {
                tasks[taskIndex].history = tasks[taskIndex].history.filter(entry => entry.date !== today);
                taskTextSpan.classList.remove("completed");
                minusBtn.disabled = false;
            }
            calculateAndRenderStats(tasks[taskIndex], listItem.querySelector('.task-stats'));
            saveTasks();
        }
    });

    minusBtn.addEventListener("click", function() {
        const taskId = listItem.getAttribute("data-id");
        const taskIndex = tasks.findIndex(task => task.id == taskId);
        
        if (taskIndex !== -1) {
            const today = getTodayDate();
            const wasMissedToday = tasks[taskIndex].history.some(entry => entry.date === today && entry.status === 'missed');

            if (wasMissedToday) {
                tasks[taskIndex].history = tasks[taskIndex].history.filter(entry => !(entry.date === today && entry.status === 'missed'));
                
                minusBtn.textContent = '-';
                minusBtn.disabled = false;
                checkbox.disabled = false;
                taskTextSpan.classList.remove("missed");
                
            } else {
                const reason = prompt("Why was this task missed today?");
                // Remove any pending/completed status for today
                tasks[taskIndex].history = tasks[taskIndex].history.filter(entry => entry.date !== today);
                tasks[taskIndex].history.push({ date: today, status: 'missed', reason: reason || 'No reason provided' });
                
                minusBtn.textContent = '+';
                checkbox.disabled = true;
                taskTextSpan.classList.add("missed");
                taskTextSpan.classList.remove("completed");
                checkbox.checked = false;
            }
            calculateAndRenderStats(tasks[taskIndex], listItem.querySelector('.task-stats'));
            saveTasks();
        }
    });
    
    const deleteBtn = listItem.querySelector(".delete-button");
    deleteBtn.addEventListener("click", function() {
        const taskId = listItem.getAttribute("data-id");
        tasks = tasks.filter(task => task.id != taskId);
        listItem.remove();
        saveTasks();
    });
}

showTasks();

// UPDATED: addTaskButton now also adds a 'not-started' history entry for the day
addTaskButton.addEventListener("click", function() {
    const taskText = taskInput.value.trim();
    if(taskText !== "") {
        const today = getTodayDate();
        const newTaskData = {
            id: Date.now(),
            text: taskText,
            isCompleted: false,
            startDate: today,
            history: []
        };
        tasks.push(newTaskData);
        renderTask(newTaskData);
        saveTasks();
        taskInput.value = "";
    }
});