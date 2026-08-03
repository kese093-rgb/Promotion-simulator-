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
    document.querySelectorAll('.screen').forEach(function(s) {
        s.classList.remove('active');
    });
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function goToMenu() {
    myMode = null;
    showScreen('menu');
    renderAllFightersPreview();
}

function showCreator(type) {
    if (type === 'fighter') {
        showScreen('fighter-creator');
        updatePreviewStats();
    } else {
        showScreen('promotion-creator');
    }
}

function logout() {
    if (socket) socket.disconnect();
    socket = null;
    myPlayer = null;
    myMode = null;
    goToMenu();
}

// ============================================
// АВТОПОДКЛЮЧЕНИЕ
// ============================================
function autoConnect(name) {
    myPlayer = { name: name, id: null };

    if (socket && socket.connected) {
        socket.emit('register', { name: name });
        return;
    }

    socket = io();

    socket.on('connect', function() {
        socket.emit('register', { name: name });
    });

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
        renderAllFightersPreview();
        renderChatMessages();
        updateMailBadge();
        if (document.getElementById('dashboard').classList.contains('active')) {
            showTab(currentTab);
        }
    });

    socket.on('playerJoined', function(data) {
        gameData.onlineCount = data.onlineCount;
        updateOnlineCount();
        addChatMessage({
            from: 'Система',
            text: data.message,
            system: true,
            time: new Date().toISOString()
        });
    });

    socket.on('playerLeft', function(data) {
        gameData.onlineCount = data.onlineCount;
        updateOnlineCount();
        addChatMessage({
            from: 'Система',
            text: data.message,
            system: true,
            time: new Date().toISOString()
        });
    });

    socket.on('newMessage', function(msg) {
        addChatMessage(msg);
    });

    socket.on('fighterCreated', function(fighter) {
        gameData.fighters.push(fighter);
        if (document.getElementById('dashboard').classList.contains('active')) {
            showTab(currentTab);
        }
        renderAllFightersPreview();
    });

    socket.on('promotionCreated', function(promo) {
        gameData.promotions.push(promo);
        if (document.getElementById('dashboard').classList.contains('active') && currentTab === 'promotions') {
            showTab('promotions');
        }
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
    html += '<button class="nav-btn" onclick="showTab(\'allfighters\')">👥 Все бойцы</button>';
    html += '<button class="nav-btn" onclick="showTab(\'promotions\')">🏢 Промоушны</button>';
    if (myMode === 'fighter') {
        html += '<button class="nav-btn" onclick="showTab(\'training\')">🏋️ Тренировки</button>';
        html += '<button class="nav-btn" onclick="showTab(\'fights\')">🥊 Бои</button>';
        html += '<button class="nav-btn" onclick="showTab(\'shop\')">🛒 Магазин</button>';
    }
    if (myMode === 'promoter') {
        html += '<button class="nav-btn" onclick="showTab(\'myroster\')">📋 Мой ростер</button>';
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
            if (buttons[i].textContent.toLowerCase().includes(tab.toLowerCase())) {
                buttons[i].classList.add('active');
            }
        }
    }
    renderTabContent(tab);
}

// ============================================
// ПОИСК ИГРОКА
// ============================================
function findMyFighter() {
    if (!myPlayer) return null;
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].ownerId === myPlayer.id && !gameData.fighters[i].isBot) {
            return gameData.fighters[i];
        }
    }
    return null;
}

function findMyPromotion() {
    if (!myPlayer) return null;
    for (var i = 0; i < gameData.promotions.length; i++) {
        if (gameData.promotions[i].ownerId === myPlayer.id && !gameData.promotions[i].isAI) {
            return gameData.promotions[i];
        }
    }
    return null;
}

// ============================================
// ТАБЛИЦЫ (общие)
// ============================================
function renderAllFightersPreview() {
    var container = document.getElementById('all-fighters-preview');
    if (!container) return;
    var fighters = gameData.fighters.slice(0, 10);
    var html = '<h3 style="font-size:14px;margin-bottom:10px;">👥 Бойцы в мире (' + gameData.fighters.length + ')</h3>';
    if (fighters.length === 0) {
        html += '<p style="color:var(--text2);">Нет бойцов</p>';
    } else {
        html += '<table class="data-table"><thead><tr><th>Боец</th><th>Стиль</th><th>Страна</th><th>Хайп</th></tr></thead><tbody>';
        fighters.forEach(function(f) {
            html += '<tr><td><strong>' + f.fullName + '</strong>' + (f.isBot ? ' 🤖' : '') + '</td><td>' + f.baseStyle + '</td><td>' + f.country + '</td><td>' + (f.hype || 0) + '</td></tr>';
        });
        html += '</tbody></table>';
    }
    container.innerHTML = html;
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
            area.innerHTML = f ? renderFighterOverview(f) : '<h2>📊 Обзор</h2><p style="color:var(--text2);">Создайте бойца!</p>';
        } else if (myMode === 'promoter') {
            var p = findMyPromotion();
            area.innerHTML = p ? renderPromotionOverview(p) : '<h2>📊 Обзор</h2><p style="color:var(--text2);">Создайте промоушн!</p>';
        } else {
            area.innerHTML = '<h2>📊 Обзор</h2><p>Онлайн: ' + gameData.onlineCount + '</p><p>Бойцов: ' + gameData.fighters.length + '</p><p>Промоушнов: ' + gameData.promotions.length + '</p>';
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
