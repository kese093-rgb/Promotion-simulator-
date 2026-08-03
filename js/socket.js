// ============================================
// ПОДКЛЮЧЕНИЕ К СЕРВЕРУ И ОБЩИЕ ФУНКЦИИ
// ============================================

var socket = null;
var myPlayer = null;
var myMode = null;
var gameData = {
    fighters: [],
    promotions: [],
    messages: [],
    notifications: [],
    onlineCount: 0,
    events: []
};
var currentTab = 'overview';
var lastTrainTime = {};

// ============================================
// НАВИГАЦИЯ
// ============================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function goToMenu() {
    myMode = null;
    showScreen('menu');
    updateSaveSlotsInfo();
}

function showCreator(type) {
    if (type === 'fighter') showScreen('fighter-creator');
    else showScreen('promotion-creator');
    if (type === 'fighter') updatePreviewStats();
}

function logout() {
    if (socket) socket.disconnect();
    socket = null;
    myPlayer = null;
    myMode = null;
    goToMenu();
}

// ============================================
// СОХРАНЕНИЯ (слоты)
// ============================================
function updateSaveSlotsInfo() {
    var container = document.getElementById('save-slots-info');
    if (!container) return;
    var html = '<h3 style="margin-top:15px;">💾 Слоты сохранений</h3>';
    
    // Слот бойца
    var careerData = localStorage.getItem('ps_career_slot');
    if (careerData) {
        try {
            var save = JSON.parse(careerData);
            var f = save.fighter;
            var d = new Date(save.timestamp).toLocaleString('ru');
            html += '<div class="stat-card" style="cursor:pointer;margin:5px 0;" onclick="loadCareerSlot()">';
            html += '<strong>👤 Карьера бойца:</strong> ' + f.fullName + '<br>';
            html += '<span style="color:var(--text2);font-size:12px;">Сохранено: ' + d + '</span>';
            html += '</div>';
        } catch(e) {}
    } else {
        html += '<div class="stat-card" style="margin:5px 0;"><span style="color:var(--text2);">👤 Слот бойца пуст</span></div>';
    }
    
    // Слот промоутера
    var promoData = localStorage.getItem('ps_promoter_slot');
    if (promoData) {
        try {
            var save = JSON.parse(promoData);
            var p = save.promotion;
            var d = new Date(save.timestamp).toLocaleString('ru');
            html += '<div class="stat-card" style="cursor:pointer;margin:5px 0;" onclick="loadPromotionSlot()">';
            html += '<strong>🏢 Промоутер:</strong> ' + p.name + '<br>';
            html += '<span style="color:var(--text2);font-size:12px;">Сохранено: ' + d + '</span>';
            html += '</div>';
        } catch(e) {}
    } else {
        html += '<div class="stat-card" style="margin:5px 0;"><span style="color:var(--text2);">🏢 Слот менеджера пуст</span></div>';
    }
    
    container.innerHTML = html;
}

function loadCareerSlot() {
    var data = localStorage.getItem('ps_career_slot');
    if (!data) return;
    var save = JSON.parse(data);
    autoConnect(save.fighter.fullName);
    setTimeout(function() {
        if (!socket || !myPlayer) return;
        myPlayer.id = save.fighter.ownerId || myPlayer.id;
        myMode = 'fighter';
        // Восстанавливаем бойца в gameData
        var exists = false;
        for (var i = 0; i < gameData.fighters.length; i++) {
            if (gameData.fighters[i].id === save.fighter.id) {
                gameData.fighters[i] = save.fighter;
                exists = true;
                break;
            }
        }
        if (!exists) gameData.fighters.push(save.fighter);
        lastTrainTime = save.lastTrainTime || {};
        showScreen('dashboard');
        buildSidebarNav();
        showTab('overview');
    }, 800);
}

function loadPromotionSlot() {
    var data = localStorage.getItem('ps_promoter_slot');
    if (!data) return;
    var save = JSON.parse(data);
    autoConnect(save.promotion.name + ' Manager');
    setTimeout(function() {
        if (!socket || !myPlayer) return;
        myMode = 'promoter';
        var exists = false;
        for (var i = 0; i < gameData.promotions.length; i++) {
            if (gameData.promotions[i].id === save.promotion.id) {
                gameData.promotions[i] = save.promotion;
                exists = true;
                break;
            }
        }
        if (!exists) gameData.promotions.push(save.promotion);
        showScreen('dashboard');
        buildSidebarNav();
        showTab('overview');
    }, 800);
}

// ============================================
// АВТОПОДКЛЮЧЕНИЕ
// ============================================
function autoConnect(name) {
    myPlayer = { name: name, id: null };
    if (socket && socket.connected) { socket.emit('register', { name: name }); return; }
    socket = io();

    socket.on('connect', function() { socket.emit('register', { name: name }); });
    socket.on('registered', function(data) {
        myPlayer.id = data.id;
        document.getElementById('sidebar-name').textContent = name;
        document.getElementById('sidebar-info').textContent = 'Онлайн';
        buildSidebarNav();
        showScreen('dashboard');
        showTab('overview');
    });
    socket.on('serverState', function(data) {
        gameData.fighters = data.fighters || [];
        gameData.promotions = data.promotions || [];
        gameData.messages = data.messages || [];
        gameData.notifications = data.notifications || [];
        gameData.events = data.events || [];
        gameData.onlineCount = data.onlineCount || 0;
        updateOnlineCount();
        renderChatMessages();
        updateMailBadge();
        updateSaveSlotsInfo();
        if (document.getElementById('dashboard').classList.contains('active')) showTab(currentTab);
    });
    socket.on('playerJoined', function(data) {
        gameData.onlineCount = data.onlineCount;
        updateOnlineCount();
        addChatMessage({ from: 'Система', text: data.message, system: true, time: new Date().toISOString() });
    });
    socket.on('playerLeft', function(data) {
        gameData.onlineCount = data.onlineCount;
        updateOnlineCount();
        addChatMessage({ from: 'Система', text: data.message, system: true, time: new Date().toISOString() });
    });
    socket.on('newMessage', function(msg) { addChatMessage(msg); });
    socket.on('fighterCreated', function(fighter) {
        gameData.fighters.push(fighter);
        if (document.getElementById('dashboard').classList.contains('active')) showTab(currentTab);
    });
    socket.on('promotionCreated', function(promo) {
        gameData.promotions.push(promo);
        if (document.getElementById('dashboard').classList.contains('active') && currentTab === 'promotions') showTab('promotions');
    });
    socket.on('notification', function(notif) {
        gameData.notifications.unshift(notif);
        updateMailBadge();
    });
    socket.on('disconnect', function() {
        document.getElementById('sidebar-info').textContent = 'Отключено';
    });
}

function updateOnlineCount() {
    var oc = document.getElementById('online-count');
    var co = document.getElementById('chat-online');
    if (oc) oc.textContent = gameData.onlineCount + ' онлайн';
    if (co) co.textContent = gameData.onlineCount;
}

// ============================================
// САЙДБАР
// ============================================
function buildSidebarNav() {
    var nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    var html = '';
    html += '<button class="nav-btn active" onclick="showTab(\'overview\')">📊 Обзор</button>';
    html += '<button class="nav-btn" onclick="showTab(\'allfighters\')">👥 Бойцы</button>';
    html += '<button class="nav-btn" onclick="showTab(\'promotions\')">🏢 Промоушны</button>';
    if (myMode === 'fighter') {
        html += '<button class="nav-btn" onclick="showTab(\'training\')">🏋️ Тренировки</button>';
        html += '<button class="nav-btn" onclick="showTab(\'fights\')">🥊 Бои</button>';
        html += '<button class="nav-btn" onclick="showTab(\'shop\')">🛒 Магазин</button>';
    }
    if (myMode === 'promoter') {
        html += '<button class="nav-btn" onclick="showTab(\'myroster\')">📋 Ростер</button>';
        html += '<button class="nav-btn" onclick="showTab(\'events\')">📅 Карды</button>';
        html += '<button class="nav-btn" onclick="showTab(\'finances\')">💰 Финансы</button>';
    }
    html += '<button class="nav-btn" onclick="showTab(\'mail\')">📬 Почта <span id="mail-badge" class="badge badge-red" style="display:none;">0</span></button>';
    nav.innerHTML = html;
}

function showTab(tab) {
    currentTab = tab;
    var nav = document.getElementById('sidebar-nav');
    if (nav) {
        nav.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
        var buttons = nav.querySelectorAll('.nav-btn');
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent.toLowerCase().includes(tab.toLowerCase())) buttons[i].classList.add('active');
        }
    }
    renderTabContent(tab);
}

// ============================================
// ПОИСК
// ============================================
function findMyFighter() {
    if (!myPlayer) return null;
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].ownerId === myPlayer.id && !gameData.fighters[i].isBot) return gameData.fighters[i];
    }
    return null;
}

function findMyPromotion() {
    if (!myPlayer) return null;
    for (var i = 0; i < gameData.promotions.length; i++) {
        if (gameData.promotions[i].ownerId === myPlayer.id && !gameData.promotions[i].isAI) return gameData.promotions[i];
    }
    return null;
}

function findFighterById(id) {
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === id) return gameData.fighters[i];
    }
    return null;
}

// ============================================
// РЕНДЕР ВКЛАДОК
// ============================================
function renderTabContent(tab) {
    var area = document.getElementById('content-area');
    if (!area) return;

    if (tab === 'overview') {
        if (myMode === 'fighter') {
            var f = findMyFighter();
            area.innerHTML = f ? renderFighterOverview(f) : '<p style="color:var(--text2);">Создайте бойца через главное меню.</p>';
        } else if (myMode === 'promoter') {
            var p = findMyPromotion();
            area.innerHTML = p ? renderPromotionOverview(p) : '<p style="color:var(--text2);">Создайте промоушн через главное меню.</p>';
        } else {
            area.innerHTML = '<p>Онлайн: ' + gameData.onlineCount + ' | Бойцов: ' + gameData.fighters.length + ' | Промоушнов: ' + gameData.promotions.length + '</p>';
        }
    } else if (tab === 'allfighters') {
        area.innerHTML = renderAllFightersFull();
    } else if (tab === 'promotions') {
        area.innerHTML = renderPromotionsList();
    } else if (tab === 'training' && myMode === 'fighter') {
        area.innerHTML = renderTraining();
    } else if (tab === 'fights' && myMode === 'fighter') {
        area.innerHTML = renderFights();
    } else if (tab === 'shop' && myMode === 'fighter') {
        area.innerHTML = renderShop();
    } else if (tab === 'mail') {
        area.innerHTML = renderMail();
    } else if (tab === 'myroster' && myMode === 'promoter') {
        area.innerHTML = renderMyRoster();
    } else if (tab === 'events' && myMode === 'promoter') {
        area.innerHTML = renderMyEvents();
    } else if (tab === 'finances' && myMode === 'promoter') {
        area.innerHTML = renderMyFinances();
    }
}

// Запуск
window.onload = function() {
    showScreen('menu');
    updateSaveSlotsInfo();
    updateOnlineCount();
};
