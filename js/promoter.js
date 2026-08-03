// ============================================
// ЛОГИКА ПРОМОУТЕРА
// ============================================

// ============================================
// СОХРАНЕНИЯ
// ============================================
function savePromotionLocally() {
    var p = findMyPromotion();
    if (!p) return;
    var saveData = {
        promotion: p,
        timestamp: Date.now()
    };
    localStorage.setItem('ps_promoter_slot', JSON.stringify(saveData));
}

function loadPromotionLocally() {
    var data = localStorage.getItem('ps_promoter_slot');
    if (!data) return null;
    try {
        var saveData = JSON.parse(data);
        return saveData.promotion;
    } catch(e) {
        return null;
    }
}

function hasPromotionSave() {
    return localStorage.getItem('ps_promoter_slot') !== null;
}

// ============================================
// СОЗДАНИЕ ПРОМОУШНА
// ============================================
function createMyPromotion() {
    var managerEl = document.getElementById('promo-manager-name');
    var nameEl = document.getElementById('promo-name');
    var sportEl = document.getElementById('promo-sport');
    var countryEl = document.getElementById('promo-country');

    if (!managerEl || !nameEl) { alert('Ошибка формы!'); return; }

    var managerName = managerEl.value.trim();
    var promoName = nameEl.value.trim();
    if (!managerName) { alert('Введите имя менеджера!'); return; }
    if (!promoName) { alert('Введите название промоушна!'); return; }

    var sport = sportEl.value;
    var country = countryEl.value;

    autoConnect(managerName);

    setTimeout(function() {
        if (!socket || !myPlayer || !myPlayer.id) {
            alert('Сервер не отвечает. Подождите и попробуйте снова.');
            return;
        }
        socket.emit('createPromotion', {
            name: promoName, sport: sport, country: country, budget: 2000, popularity: 30
        });
        myMode = 'promoter';

        setTimeout(function() {
            var p = findMyPromotion();
            if (p) savePromotionLocally();
        }, 1000);
    }, 800);
}

// ============================================
// ОТРИСОВКА ПРОМОУШНА
// ============================================
function renderPromotionOverview(p) {
    var html = '<h2>📊 ' + p.name + '</h2>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><h3>💰 Бюджет</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.budget || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>⭐ Популярность</h3><div class="stat-value">' + (p.popularity || 0) + '%</div></div>';
    html += '<div class="stat-card"><h3>🏆 Спорт</h3><div class="stat-value" style="font-size:16px;">' + (p.sport || 'MMA') + '</div></div>';
    html += '<div class="stat-card"><h3>👥 Бойцы</h3><div class="stat-value">' + (p.roster ? p.roster.length : 0) + '</div></div>';
    html += '<div class="stat-card"><h3>📅 Карды</h3><div class="stat-value">' + (p.events ? p.events.length : 0) + '</div></div>';
    html += '</div>';
    html += '<button class="btn btn-green btn-large" onclick="savePromotionLocally();alert(\'Промоушн сохранён!\');">💾 Сохранить промоушн</button>';
    return html;
}

function renderPromotionsList() {
    var promos = gameData.promotions;
    var html = '<h2>🏢 Промоушны (' + promos.length + ')</h2>';
    if (promos.length === 0) {
        html += '<p style="color:var(--text2);">Нет промоушнов</p>';
        return html;
    }
    html += '<div class="stat-grid">';
    for (var i = 0; i < promos.length; i++) {
        var p = promos[i];
        html += '<div class="stat-card"><h3>' + p.name + (p.isAI ? ' 🤖' : '') + '</h3>';
        html += '<p style="font-size:12px;">' + (p.sport || 'MMA') + ' | ' + p.country + '</p>';
        html += '<p style="font-size:12px;">⭐' + (p.popularity || 0) + ' | 🪙' + (p.budget || 0) + ' | Бойцов: ' + (p.roster ? p.roster.length : 0) + '</p>';
        if (myMode === 'fighter') {
            var f = findMyFighter();
            if (f && !f.currentPromotionId) {
                html += '<button class="btn btn-primary btn-small" onclick="applyToPromotion(\'' + p.id + '\')">Подать заявку</button>';
            } else if (f && f.currentPromotionId === p.id) {
                html += '<span class="badge badge-green">Вы здесь</span>';
            }
        }
        html += '</div>';
    }
    html += '</div>';
    return html;
}

// ============================================
// ЗАЯВКА В ПРОМОУШН (боец подаёт)
// ============================================
function applyToPromotion(promoId) {
    if (!socket || !myPlayer) { alert('Нет подключения к серверу!'); return; }
    var f = findMyFighter();
    if (!f) { alert('Сначала создайте бойца!'); return; }
    var amount = parseInt(prompt('Ваша цена за контракт (🪙):'));
    if (!amount || amount <= 0) return;

    socket.emit('applyToPromotion', {
        fighterId: f.id,
        promotionId: promoId,
        amount: amount,
        fighterName: f.fullName
    });

    alert('Заявка отправлена менеджеру промоушна! Ожидайте ответа в почте.');
}

// ============================================
// МОЙ РОСТЕР
// ============================================
function renderMyRoster() {
    var p = findMyPromotion();
    if (!p) return '<p style="color:var(--text2);">Создайте промоушн!</p>';

    var rosterFighters = [];
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (p.roster && p.roster.indexOf(gameData.fighters[i].id) !== -1) {
            rosterFighters.push(gameData.fighters[i]);
        }
    }

    var html = '<h2>📋 Мой ростер (' + rosterFighters.length + ' бойцов)</h2>';
    if (rosterFighters.length === 0) {
        html += '<p style="color:var(--text2);">Ростер пуст.</p>';
        html += '<p style="color:var(--text2);">Подпишите бойцов через вкладку "Все бойцы" или принимайте заявки через "Почту".</p>';
    } else {
        html += '<table class="data-table"><thead><tr><th>Боец</th><th>Стиль</th><th>Рекорд</th><th>Хайп</th><th>Действие</th></tr></thead><tbody>';
        for (var i = 0; i < rosterFighters.length; i++) {
            var f = rosterFighters[i];
            var rec = f.records || { wins: 0, losses: 0 };
            html += '<tr><td><strong>' + f.fullName + '</strong></td><td>' + f.baseStyle + '</td><td>' + rec.wins + '-' + rec.losses + '</td><td>' + (f.hype || 0) + '</td>';
            html += '<td><button class="btn btn-danger btn-small" onclick="removeFromRoster(\'' + f.id + '\')">Уволить</button></td></tr>';
        }
        html += '</tbody></table>';
    }
    return html;
}

function removeFromRoster(fighterId) {
    var p = findMyPromotion();
    if (!p) return;
    if (!confirm('Уволить бойца из ростера?')) return;

    p.roster = p.roster.filter(function(id) { return id !== fighterId; });
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === fighterId) {
            gameData.fighters[i].currentPromotionId = null;
            break;
        }
    }

    if (socket) {
        socket.emit('updatePromotion', p);
        var f = null;
        for (var i = 0; i < gameData.fighters.length; i++) {
            if (gameData.fighters[i].id === fighterId) { f = gameData.fighters[i]; break; }
        }
        if (f) socket.emit('updateFighter', f);
    }
    savePromotionLocally();
    showTab('myroster');
}

// ============================================
// КАРДЫ
// ============================================
function renderMyEvents() {
    var p = findMyPromotion();
    if (!p) return '<p style="color:var(--text2);">Создайте промоушн!</p>';

    var myEvents = [];
    for (var i = 0; i < gameData.events.length; i++) {
        if (gameData.events[i].promotionId === p.id) myEvents.push(gameData.events[i]);
    }

    var html = '<h2>📅 Карды (' + myEvents.length + ')</h2>';
    html += '<button class="btn btn-blue btn-large" onclick="createCard()">➕ Создать новый кард</button>';

    if (myEvents.length > 0) {
        html += '<div class="stat-grid" style="margin-top:15px;">';
        for (var i = 0; i < myEvents.length; i++) {
            var evt = myEvents[i];
            var date = new Date(evt.date).toLocaleDateString('ru');
            html += '<div class="stat-card"><h3>' + evt.name + '</h3>';
            html += '<p style="font-size:11px;">📅 ' + date + ' | Бои: ' + (evt.fights ? evt.fights.length : 0) + '/3</p>';
            if (evt.fights) {
                for (var j = 0; j < evt.fights.length; j++) {
                    var fight = evt.fights[j];
                    var f1 = null, f2 = null;
                    for (var k = 0; k < gameData.fighters.length; k++) {
                        if (gameData.fighters[k].id === fight.fighter1) f1 = gameData.fighters[k];
                        if (gameData.fighters[k].id === fight.fighter2) f2 = gameData.fighters[k];
                    }
                    html += '<p style="font-size:10px;">' + (j === 0 ? '⭐ ' : '') + (f1 ? f1.fullName : '?') + ' vs ' + (f2 ? f2.fullName : '?') + ' | 🪙' + (fight.purse1 || 0) + '/' + (fight.purse2 || 0) + '</p>';
                }
            }
            if (!evt.fights || evt.fights.length < 3) {
                html += '<button class="btn btn-small btn-green" onclick="addFightToCard(\'' + evt.id + '\')">+ Добавить бой</button>';
            }
            html += '</div>';
        }
        html += '</div>';
    }
    return html;
}

function createCard() {
    if (!socket) { alert('Нет подключения!'); return; }
    var p = findMyPromotion();
    if (!p) return;

    var name = prompt('Название карда:', p.name + ' Fight Night');
    if (!name) return;

    var dateStr = prompt('Дата проведения (ДД.ММ.ГГГГ):', new Date(Date.now() + 14*86400000).toLocaleDateString('ru'));
    if (!dateStr) return;

    var parts = dateStr.split('.');
    var date = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));

    socket.emit('createEvent', {
        name: name,
        promotionId: p.id,
        date: date.toISOString(),
        fights: []
    });

    savePromotionLocally();
    setTimeout(function() { showTab('events'); }, 500);
}

function addFightToCard(eventId) {
    var p = findMyPromotion();
    if (!p) return;

    var evt = null;
    for (var i = 0; i < gameData.events.length; i++) {
        if (gameData.events[i].id === eventId) { evt = gameData.events[i]; break; }
    }
    if (!evt || (evt.fights && evt.fights.length >= 3)) {
        alert('Максимум 3 боя на кард!');
        return;
    }

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

    var list = '';
    for (var i = 0; i < rosterFighters.length; i++) {
        list += (i+1) + '. ' + rosterFighters[i].fullName + ' (' + rosterFighters[i].baseStyle + ')\n';
    }

    var f1name = prompt('Боец 1 (главный бой):\n\n' + list);
    var f2name = prompt('Боец 2 (соперник):\n\n' + list);

    var f1 = null, f2 = null;
    for (var i = 0; i < rosterFighters.length; i++) {
        if (rosterFighters[i].fullName.toLowerCase() === (f1name || '').toLowerCase()) f1 = rosterFighters[i];
        if (rosterFighters[i].fullName.toLowerCase() === (f2name || '').toLowerCase()) f2 = rosterFighters[i];
    }

    if (!f1 || !f2 || f1.id === f2.id) {
        alert('Ошибка выбора бойцов! Проверьте имена.');
        return;
    }

    var purse1 = parseInt(prompt('Гонорар для ' + f1.fullName + ':\nСлабый: 50-100 | Средний: 100-250 | Сильный: 250-500'));
    var purse2 = parseInt(prompt('Гонорар для ' + f2.fullName + ':'));
    if (!purse1 || !purse2 || (p.budget || 0) < (purse1 + purse2)) {
        alert('Недостаточно средств в бюджете! Бюджет: 🪙' + (p.budget || 0));
        return;
    }

    p.budget -= (purse1 + purse2);
    p.expenses = (p.expenses || 0) + (purse1 + purse2);

    if (!evt.fights) evt.fights = [];
    evt.fights.push({
        fighter1: f1.id,
        fighter2: f2.id,
        purse1: purse1,
        purse2: purse2,
        isMain: evt.fights.length === 0
    });

    // Выплачиваем бойцам
    f1.coins = (f1.coins || 0) + purse1;
    f2.coins = (f2.coins || 0) + purse2;

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
    if (!p) return '<p style="color:var(--text2);">Создайте промоушн!</p>';
    var html = '<h2>💰 Финансы</h2>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><h3>💰 Баланс</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.budget || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>📈 Доходы</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.revenue || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>📉 Расходы</h3><div class="stat-value" style="color:var(--red);">🪙' + (p.expenses || 0) + '</div></div>';
    html += '</div>';
    html += '<button class="btn btn-green btn-large" onclick="savePromotionLocally();alert(\'Промоушн сохранён!\');">💾 Сохранить промоушн</button>';
    return html;
            }
