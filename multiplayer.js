const socket = io();

let allFighters = [];
let allPromotions = [];
let myFighter = null;
let myPlayerId = null;
let promotionCodeUsed = false;

socket.on('connect', () => {
    myPlayerId = socket.id;
    socket.emit('register', 'Игрок');
});

socket.on('serverState', (data) => {
    allFighters = data.fighters || [];
    allPromotions = data.promotions || [];

    myFighter = allFighters.find(f => f.ownerId === myPlayerId) || null;

    updateSaveSlots();
    updateButtons();
    updateOnlineCount(data.onlineCount || 0);
});

socket.on('fighterCreated', (fighter) => {
    if (!allFighters.some(f => f.id === fighter.id)) {
        allFighters.push(fighter);
    }

    if (fighter.ownerId === myPlayerId) {
        myFighter = fighter;
    }

    updateSaveSlots();
});

socket.on('fighterUpdated', (fighter) => {
    const index = allFighters.findIndex(f => f.id === fighter.id);

    if (index !== -1) {
        allFighters[index] = fighter;
    } else {
        allFighters.push(fighter);
    }

    if (fighter.ownerId === myPlayerId) {
        myFighter = fighter;
    }

    updateSaveSlots();
});

socket.on('promotionUpdated', (promotion) => {
    if (promotion.deleted) {
        allPromotions = allPromotions.filter(p => p.id !== promotion.id);
    } else {
        const index = allPromotions.findIndex(p => p.id === promotion.id);

        if (index !== -1) {
            allPromotions[index] = promotion;
        } else {
            allPromotions.push(promotion);
        }
    }

    if (typeof renderPromotionsList === 'function') {
        renderPromotionsList();
    }
});

socket.on('playerJoined', data => {
    updateOnlineCount(data.onlineCount);
});

socket.on('playerLeft', data => {
    updateOnlineCount(data.onlineCount);
});

function updateOnlineCount(count) {
    const el = document.getElementById('online-count');
    if (el) {
        el.textContent = count + ' онлайн';
    }
}

function saveAllData() {
    if (myFighter) {
        socket.emit('updateFighter', myFighter);
    }
}

function updateSaveSlots() {
    const container = document.getElementById('save-slots');
    if (!container) return;

    const fighters = allFighters.filter(f => f.ownerId === myPlayerId);

    if (fighters.length === 0) {
        container.innerHTML =
            '<p style="color:var(--text2);">Сохранённых бойцов нет.</p>';
        return;
    }

    let html = '';

    fighters.forEach(f => {
        html += `
            <div class="stat-card">
                <h3>👤 ${f.fullName}</h3>
                <p>${f.country || ''} | ${f.division || ''}</p>
                <button class="btn btn-blue btn-small"
                    onclick="selectFighter('${f.id}')">
                    Выбрать
                </button>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateButtons() {
    const btn = document.getElementById('btn-create-fighter');

    if (btn) {
        btn.disabled = false;
    }
}

function selectFighter(id) {
    const fighter = allFighters.find(f => f.id === id);

    if (!fighter) {
        alert('Боец не найден!');
        return;
    }

    myFighter = fighter;

    if (typeof showFighterDashboard === 'function') {
        showFighterDashboard();
    } else {
        showScreen('fighter-dashboard');
        if (typeof showFighterTab === 'function') {
            showFighterTab('profile');
        }
    }
}

function loadFighter() {
    const fighters = allFighters.filter(f => f.ownerId === myPlayerId);

    if (fighters.length === 0) {
        alert('У вас нет сохранённых бойцов!');
        return;
    }

    if (fighters.length === 1) {
        selectFighter(fighters[0].id);
        return;
    }

    let list = 'Выберите бойца:\n\n';

    fighters.forEach((f, i) => {
        list += `${i + 1}. ${f.fullName}\n`;
    });

    const choice = prompt(list);

    if (!choice) return;

    const index = parseInt(choice) - 1;

    if (index >= 0 && index < fighters.length) {
        selectFighter(fighters[index].id);
    } else {
        alert('Неверный выбор!');
    }
}

function globalCleanup() {
    if (!confirm('💀 УДАЛИТЬ ВСЕХ БОЙЦОВ И ПРОМОУШНЫ У ВСЕХ?')) return;

    socket.emit('globalCleanup');
    }
