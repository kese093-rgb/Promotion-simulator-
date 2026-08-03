// ============================================
// ЛОГИКА ПРОМОУТЕРА — ПОЛНАЯ ВЕРСИЯ
// ============================================

// Сохранения
function savePromotionLocally() {
    var p = findMyPromotion();
    if (!p) return;
    localStorage.setItem('ps_promoter_slot', JSON.stringify({ promotion: p, timestamp: Date.now() }));
}

function loadPromotionLocally() {
    var d = localStorage.getItem('ps_promoter_slot');
    if (!d) return null;
    try { return JSON.parse(d).promotion; } catch(e) { return null; }
}

// Создание промоушна
function createMyPromotion() {
    var managerName = document.getElementById('promo-manager-name').value.trim();
    var promoName = document.getElementById('promo-name').value.trim();
    if (!managerName) { alert('Введите имя менеджера!'); return; }
    if (!promoName) { alert('Введите название!'); return; }
    var sport = document.getElementById('promo-sport').value;
    var country = document.getElementById('promo-country').value;

    autoConnect(managerName);
    setTimeout(function() {
        if (!socket || !myPlayer || !myPlayer.id) { alert('Сервер не отвечает.'); return; }
        socket.emit('createPromotion', { name: promoName, sport: sport, country: country, budget: 2000, popularity: 30 });
        myMode = 'promoter';
        setTimeout(function() { savePromotionLocally(); }, 1000);
    }, 800);
}

// Отрисовка
function renderPromotionOverview(p) {
    var h = '<h2>📊 ' + p.name + '</h2><div class="stat-grid">';
    h += '<div class="stat-card"><h3>💰 Бюджет</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.budget||0) + '</div></div>';
    h += '<div class="stat-card"><h3>⭐ Популярность</h3><div class="stat-value">' + (p.popularity||0) + '%</div></div>';
    h += '<div class="stat-card"><h3>🏆 Спорт</h3><div class="stat-value" style="font-size:1.2rem;">' + (p.sport||'MMA') + '</div></div>';
    h += '<div class="stat-card"><h3>👥 Бойцы</h3><div class="stat-value">' + (p.roster?p.roster.length:0) + '</div></div>';
    h += '<div class="stat-card"><h3>📅 Карды</h3><div class="stat-value">' + (p.events?p.events.length:0) + '</div></div>';
    h += '</div><button class="btn btn-green" onclick="savePromotionLocally();alert(\'Сохранено!\');">💾 Сохранить</button>';
    return h;
}

function renderPromotionsList() {
    var h = '<h2>🏢 Промоушны (' + gameData.promotions.length + ')</h2><div class="stat-grid">';
    for (var i = 0; i < gameData.promotions.length; i++) {
        var p = gameData.promotions[i];
        h += '<div class="stat-card"><h3>' + p.name + (p.isAI?' 🤖':'') + '</h3><p style="font-size:0.8rem;">' + (p.sport||'MMA') + ' | ' + p.country + '</p><p style="font-size:0.8rem;">⭐' + (p.popularity||0) + ' | Бойцов: ' + (p.roster?p.roster.length:0) + '</p>';
        if (myMode === 'fighter') {
            var f = findMyFighter();
            if (f && !f.currentPromotionId) h += '<button class="btn btn-primary btn-small" onclick="applyToPromotion(\'' + p.id + '\')">Подать заявку</button>';
            else if (f && f.currentPromotionId === p.id) h += '<span class="badge badge-green">Вы здесь</span>';
        }
        h += '</div>';
    }
    h += '</div>';
    return h;
}

// Заявка в промоушн
function applyToPromotion(promoId) {
    var f = findMyFighter();
    if (!f) { alert('Создайте бойца!'); return; }
    var amount = parseInt(prompt('Ваша цена за контракт (🪙):'));
    if (!amount || amount <= 0) return;
    socket.emit('applyToPromotion', { fighterId: f.id, promotionId: promoId, amount: amount, fighterName: f.fullName });
    alert('Заявка отправлена!');
}

// Ростер
function renderMyRoster() {
    var p = findMyPromotion();
    if (!p) return '<p>Создайте промоушн!</p>';
    var roster = [];
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (p.roster && p.roster.indexOf(gameData.fighters[i].id) !== -1) roster.push(gameData.fighters[i]);
    }
    var h = '<h2>📋 Мой ростер (' + roster.length + ')</h2>';
    if (roster.length === 0) {
        h += '<p style="color:var(--text2);">Пусто. Подпишите бойцов через "Все бойцы" или примите заявки в "Почте".</p>';
    } else {
        h += '<table class="data-table"><thead><tr><th>Боец</th><th>Стиль</th><th>Рекорд</th><th>Хайп</th><th></th></tr></thead><tbody>';
        for (var i = 0; i < roster.length; i++) {
            var f = roster[i], rec = f.records || { wins:0, losses:0 };
            h += '<tr><td><strong>' + f.fullName + '</strong></td><td>' + f.baseStyle + '</td><td>' + rec.wins + '-' + rec.losses + '</td><td>' + (f.hype||0) + '</td><td><button class="btn btn-danger btn-small" onclick="removeFromRoster(\'' + f.id + '\')">Уволить</button></td></tr>';
        }
        h += '</tbody></table>';
    }
    return h;
}

function removeFromRoster(fid) {
    var p = findMyPromotion();
    if (!p || !confirm('Уволить?')) return;
    p.roster = p.roster.filter(function(id) { return id !== fid; });
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === fid) { gameData.fighters[i].currentPromotionId = null; break; }
    }
    if (socket) { socket.emit('updatePromotion', p); var f = findFighterById(fid); if (f) socket.emit('updateFighter', f); }
    savePromotionLocally();
    showTab('myroster');
}

function findFighterById(id) {
    for (var i = 0; i < gameData.fighters.length; i++) { if (gameData.fighters[i].id === id) return gameData.fighters[i]; }
    return null;
}

// Подписание бойца
function signFighter(fid) {
    var p = findMyPromotion();
    if (!p) { alert('Создайте промоушн!'); return; }
    var f = findFighterById(fid);
    if (!f) return;
    var amount = parseInt(prompt('Сумма контракта для ' + f.fullName + ':\nСлабый: 10-50 | Средний: 50-150 | Сильный: 150-300'));
    if (!amount || amount <= 0 || p.budget < amount) { alert('Недостаточно средств!'); return; }
    p.budget -= amount;
    p.expenses = (p.expenses||0) + amount;
    if (!p.roster) p.roster = [];
    p.roster.push(f.id);
    f.currentPromotionId = p.id;
    f.coins = (f.coins||0) + amount;
    if (socket) { socket.emit('updateFighter', f); socket.emit('updatePromotion', p); }
    savePromotionLocally();
    showTab('allfighters');
    alert(f.fullName + ' подписан за 🪙' + amount + '!');
}

// ============================================
// КАРДЫ (выбор бойцов нажатием, календарь)
// ============================================
var selectedFighters = [];
var currentEventId = null;

function renderMyEvents() {
    var p = findMyPromotion();
    if (!p) return '<p>Создайте промоушн!</p>';

    var myEvents = [];
    for (var i = 0; i < gameData.events.length; i++) {
        if (gameData.events[i].promotionId === p.id) myEvents.push(gameData.events[i]);
    }

    // Сортируем по дате
    myEvents.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });

    var h = '<h2>📅 Карды (' + myEvents.length + ')</h2>';
    h += '<button class="btn btn-blue btn-large" onclick="createCard()">➕ Создать новый кард</button>';

    if (myEvents.length > 0) {
        var now = new Date();
        h += '<div class="stat-grid" style="margin-top:1rem;">';
        for (var i = 0; i < myEvents.length; i++) {
            var evt = myEvents[i];
            var d = new Date(evt.date);
            var dateStr = d.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' });
            var isPast = d < now;
            var isToday = d.toDateString() === now.toDateString();

            h += '<div class="stat-card" style="' + (isPast ? 'opacity:0.6;' : '') + (isToday ? 'border-color:var(--red);' : '') + '">';
            h += '<h3>' + evt.name + (isToday ? ' 🔴 СЕГОДНЯ' : '') + '</h3>';
            h += '<p style="font-size:0.8rem;">📅 ' + dateStr + (isPast ? ' (завершён)' : '') + '</p>';
            h += '<p style="font-size:0.8rem;">Бои: ' + (evt.fights ? evt.fights.length : 0) + '/3</p>';

            if (evt.fights) {
                for (var j = 0; j < evt.fights.length; j++) {
                    var fight = evt.fights[j];
                    var f1 = findFighterById(fight.fighter1);
                    var f2 = findFighterById(fight.fighter2);
                    h += '<p style="font-size:0.7rem;">' + (j === 0 ? '⭐ ' : '') + (f1 ? f1.fullName : '?') + ' vs ' + (f2 ? f2.fullName : '?') + ' | 🪙' + (fight.purse1||0) + '/' + (fight.purse2||0) + '</p>';
                }
            }

            if (!isPast && (!evt.fights || evt.fights.length < 3)) {
                h += '<button class="btn btn-small btn-green" onclick="openFightSelector(\'' + evt.id + '\')">+ Добавить бой</button>';
            }
            h += '</div>';
        }
        h += '</div>';
    }
    return h;
}

function createCard() {
    var p = findMyPromotion();
    if (!p || !socket) return;
    var name = prompt('Название карда:', p.name + ' Fight Night');
    if (!name) return;
    var dateStr = prompt('Дата (ДД.ММ.ГГГГ):', new Date(Date.now() + 14*86400000).toLocaleDateString('ru'));
    if (!dateStr) return;
    var parts = dateStr.split('.');
    var date = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));

    socket.emit('createEvent', { name: name, promotionId: p.id, date: date.toISOString(), fights: [] });
    savePromotionLocally();
    setTimeout(function() { showTab('events'); }, 500);
}

function openFightSelector(eventId) {
    var p = findMyPromotion();
    if (!p) return;

    var rosterFighters = [];
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (p.roster && p.roster.indexOf(gameData.fighters[i].id) !== -1) {
            rosterFighters.push(gameData.fighters[i]);
        }
    }

    if (rosterFighters.length < 2) {
        alert('Нужно минимум 2 бойца в ростере!');
        return;
    }

    selectedFighters = [];
    currentEventId = eventId;

    var area = document.getElementById('content-area');
    var h = '<h2>Выберите двух бойцов</h2>';
    h += '<p style="color:var(--text2);">Выбрано: <strong id="selected-count">0</strong>/2</p>';
    h += '<div class="stat-grid" id="fighter-selector">';

    for (var i = 0; i < rosterFighters.length; i++) {
        var f = rosterFighters[i];
        h += '<div class="stat-card" id="fighter-card-' + f.id + '" onclick="selectFighterForCard(\'' + f.id + '\')" style="cursor:pointer;">';
        h += '<h3>' + f.fullName + '</h3>';
        h += '<p style="font-size:0.8rem;">' + f.baseStyle + ' | ' + ((f.records||{}).wins||0) + '-' + ((f.records||{}).losses||0) + '</p>';
        h += '<p style="font-size:0.8rem;">Хайп: ' + (f.hype||0) + '</p>';
        h += '</div>';
    }

    h += '</div>';
    h += '<button class="btn btn-primary btn-large" id="confirm-fight-btn" onclick="confirmFightSelection()" disabled>✅ Подтвердить бой</button>';
    h += '<button class="btn btn-back" onclick="showTab(\'events\')">← Назад</button>';

    area.innerHTML = h;
}

function selectFighterForCard(fid) {
    var idx = selectedFighters.indexOf(fid);
    if (idx !== -1) {
        // Убираем
        selectedFighters.splice(idx, 1);
        var card = document.getElementById('fighter-card-' + fid);
        if (card) card.style.borderColor = 'var(--border)';
        if (card) card.style.background = 'var(--bg)';
    } else {
        if (selectedFighters.length >= 2) {
            alert('Вы уже выбрали 2 бойцов!');
            return;
        }
        selectedFighters.push(fid);
        var card = document.getElementById('fighter-card-' + fid);
        if (card) card.style.borderColor = 'var(--red)';
        if (card) card.style.background = '#fff0f0';
    }

    document.getElementById('selected-count').textContent = selectedFighters.length;
    var btn = document.getElementById('confirm-fight-btn');
    if (btn) btn.disabled = selectedFighters.length !== 2;
}

function confirmFightSelection() {
    if (selectedFighters.length !== 2 || !currentEventId) return;

    var p = findMyPromotion();
    var evt = null;
    for (var i = 0; i < gameData.events.length; i++) {
        if (gameData.events[i].id === currentEventId) { evt = gameData.events[i]; break; }
    }
    if (!evt || (evt.fights && evt.fights.length >= 3)) {
        alert('Максимум 3 боя на кард!');
        return;
    }

    var f1 = findFighterById(selectedFighters[0]);
    var f2 = findFighterById(selectedFighters[1]);

    var purse1 = parseInt(prompt('Гонорар ' + f1.fullName + ':\nСлабый: 50-100 | Средний: 100-250 | Сильный: 250-500'));
    var purse2 = parseInt(prompt('Гонорар ' + f2.fullName + ':'));
    if (!purse1 || !purse2 || (p.budget||0) < (purse1 + purse2)) {
        alert('Недостаточно средств! Бюджет: 🪙' + (p.budget||0));
        return;
    }

    p.budget -= (purse1 + purse2);
    p.expenses = (p.expenses||0) + (purse1 + purse2);
    f1.coins = (f1.coins||0) + purse1;
    f2.coins = (f2.coins||0) + purse2;

    if (!evt.fights) evt.fights = [];
    evt.fights.push({
        fighter1: f1.id,
        fighter2: f2.id,
        purse1: purse1,
        purse2: purse2,
        isMain: evt.fights.length === 0
    });

    if (socket) {
        socket.emit('updateEvent', evt);
        socket.emit('updatePromotion', p);
        socket.emit('updateFighter', f1);
        socket.emit('updateFighter', f2);
    }
    savePromotionLocally();
    showTab('events');
}

// ============================================
// ФИНАНСЫ
// ============================================
function renderMyFinances() {
    var p = findMyPromotion();
    if (!p) return '<p>Создайте промоушн!</p>';
    var h = '<h2>💰 Финансы</h2><div class="stat-grid">';
    h += '<div class="stat-card"><h3>Баланс</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.budget||0) + '</div></div>';
    h += '<div class="stat-card"><h3>Доходы</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.revenue||0) + '</div></div>';
    h += '<div class="stat-card"><h3>Расходы</h3><div class="stat-value" style="color:var(--red);">🪙' + (p.expenses||0) + '</div></div>';
    h += '</div><button class="btn btn-green" onclick="savePromotionLocally();alert(\'Сохранено!\');">💾 Сохранить</button>';
    return h;
                }
