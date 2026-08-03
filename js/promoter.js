// ============================================
// ЛОГИКА ПРОМОУТЕРА
// ============================================

// ============================================
// СОЗДАНИЕ ПРОМОУШНА
// ============================================
function createMyPromotion() {
    var managerName = document.getElementById('promo-manager-name').value.trim();
    var promoName = document.getElementById('promo-name').value.trim();
    if (!managerName) { alert('Введите имя менеджера!'); return; }
    if (!promoName) { alert('Введите название промоушна!'); return; }
    var sport = document.getElementById('promo-sport').value;
    var country = document.getElementById('promo-country').value;

    autoConnect(managerName);

    setTimeout(function() {
        if (!socket || !myPlayer || !myPlayer.id) {
            alert('Не удалось подключиться к серверу. Попробуйте ещё раз.');
            return;
        }
        socket.emit('createPromotion', {
            name: promoName, sport: sport, country: country, budget: 2000, popularity: 30
        });
        myMode = 'promoter';
    }, 800);
}

// ============================================
// ОТРИСОВКА ПРОМОУШНА
// ============================================
function renderPromotionOverview(p) {
    var html = '<h2>📊 ' + p.name + '</h2>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><h3>Бюджет</h3><div class="stat-value">🪙' + (p.budget || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Популярность</h3><div class="stat-value">' + (p.popularity || 0) + '%</div></div>';
    html += '<div class="stat-card"><h3>Спорт</h3><div class="stat-value" style="font-size:16px;">' + (p.sport || 'MMA') + '</div></div>';
    html += '<div class="stat-card"><h3>Бойцы в ростере</h3><div class="stat-value">' + (p.roster ? p.roster.length : 0) + '</div></div>';
    html += '</div>';
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
    promos.forEach(function(p) {
        html += '<div class="stat-card"><h3>' + p.name + (p.isAI ? ' 🤖' : '') + '</h3>';
        html += '<p style="font-size:12px;">' + (p.sport || 'MMA') + ' | ' + p.country + '</p>';
        html += '<p style="font-size:12px;">⭐' + (p.popularity || 0) + ' | 🪙' + (p.budget || 0) + ' | Бойцов: ' + (p.roster ? p.roster.length : 0) + '</p>';
        if (myMode === 'fighter') {
            var f = findMyFighter();
            if (f && p.roster && p.roster.indexOf(f.id) === -1) {
                html += '<button class="btn btn-primary btn-small" onclick="applyToPromotion(\'' + p.id + '\')">Подать заявку</button>';
            }
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
}

// ============================================
// ЗАЯВКА В ПРОМОУШН
// ============================================
function applyToPromotion(promoId) {
    if (!socket || !myPlayer) return;
    var f = findMyFighter();
    if (!f) { alert('Сначала создайте бойца!'); return; }
    var amount = parseInt(prompt('Ваша цена за контракт (🪙):'));
    if (!amount || amount <= 0) return;
    socket.emit('applyToPromotion', { fighterId: f.id, promotionId: promoId, amount: amount });
    alert('Заявка отправлена менеджеру промоушна!');
}

// ============================================
// МОЙ РОСТЕР
// ============================================
function renderMyRoster() {
    var p = findMyPromotion();
    if (!p) return '<p style="color:var(--text2);">Создайте промоушн!</p>';
    var html = '<h2>📋 Мой ростер</h2>';
    var rosterFighters = [];
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (p.roster && p.roster.indexOf(gameData.fighters[i].id) !== -1) {
            rosterFighters.push(gameData.fighters[i]);
        }
    }
    if (rosterFighters.length === 0) {
        html += '<p style="color:var(--text2);">Ростер пуст. Бойцы могут подать заявку через вкладку "Промоушны".</p>';
        html += '<p style="color:var(--text2);">Или подпишите бойца через вкладку "Все бойцы".</p>';
    } else {
        html += '<table class="data-table"><thead><tr><th>Боец</th><th>Стиль</th><th>Рекорд</th><th>Хайп</th><th>Действие</th></tr></thead><tbody>';
        rosterFighters.forEach(function(f) {
            var rec = f.records || { wins: 0, losses: 0 };
            html += '<tr><td><strong>' + f.fullName + '</strong></td><td>' + f.baseStyle + '</td><td>' + rec.wins + '-' + rec.losses + '</td><td>' + (f.hype || 0) + '</td><td><button class="btn btn-danger btn-small" onclick="removeFromRoster(\'' + f.id + '\')">Уволить</button></td></tr>';
        });
        html += '</tbody></table>';
    }
    return html;
}

function removeFromRoster(fighterId) {
    var p = findMyPromotion();
    if (!p) return;
    if (!confirm('Уволить бойца из ростера?')) return;
    p.roster = p.roster.filter(function(id) { return id !== fighterId; });
    var f = null;
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === fighterId) { f = gameData.fighters[i]; break; }
    }
    if (f) f.currentPromotionId = null;
    if (socket) {
        socket.emit('updatePromotion', p);
        if (f) socket.emit('updateFighter', f);
    }
    showTab('myroster');
}

// ============================================
// КАРДЫ
// ============================================
function renderMyEvents() {
    var p = findMyPromotion();
    if (!p) return '<p style="color:var(--text2);">Создайте промоушн!</p>';
    var html = '<h2>📅 Карды</h2>';
    html += '<button class="btn btn-blue btn-large" onclick="createCard()">➕ Создать новый кард</button>';

    var myEvents = [];
    for (var i = 0; i < gameData.events.length; i++) {
        if (gameData.events[i].promotionId === p.id) myEvents.push(gameData.events[i]);
    }

    if (myEvents.length > 0) {
        html += '<div class="stat-grid" style="margin-top:15px;">';
        myEvents.forEach(function(evt) {
            var date = new Date(evt.date).toLocaleDateString('ru');
            html += '<div class="stat-card"><h3>' + evt.name + '</h3><p style="font-size:11px;">📅 ' + date + '</p><p style="font-size:11px;">Бои: ' + (evt.fights ? evt.fights.length : 0) + '/3</p>';
            if (evt.fights) {
                evt.fights.forEach(function(fight, j) {
                    var f1 = null, f2 = null;
                    for (var k = 0; k < gameData.fighters.length; k++) {
                        if (gameData.fighters[k].id === fight.fighter1) f1 = gameData.fighters[k];
                        if (gameData.fighters[k].id === fight.fighter2) f2 = gameData.fighters[k];
                    }
                    html += '<p style="font-size:10px;">' + (j === 0 ? '⭐ ' : '') + (f1 ? f1.fullName : '?') + ' vs ' + (f2 ? f2.fullName : '?') + ' | 🪙' + fight.purse1 + '/' + fight.purse2 + '</p>';
                });
            }
            html += '<button class="btn btn-small btn-green" onclick="addFightToCard(\'' + evt.id + '\')">+ Добавить бой</button></div>';
        });
        html += '</div>';
    }
    return html;
}

function createCard() {
    if (!socket) return;
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
        list += (i+1) + '. ' + rosterFighters[i].fullName + '\n';
    }

    var f1name = prompt('Боец 1:\n' + list);
    var f2name = prompt('Боец 2:\n' + list);

    var f1 = null, f2 = null;
    for (var i = 0; i < rosterFighters.length; i++) {
        if (rosterFighters[i].fullName.toLowerCase() === (f1name || '').toLowerCase()) f1 = rosterFighters[i];
        if (rosterFighters[i].fullName.toLowerCase() === (f2name || '').toLowerCase()) f2 = rosterFighters[i];
    }

    if (!f1 || !f2 || f1.id === f2.id) {
        alert('Ошибка выбора бойцов!');
        return;
    }

    var purse1 = parseInt(prompt('Гонорар ' + f1.fullName + ':\nСлабый: 50-100 | Средний: 100-250 | Сильный: 250-500'));
    var purse2 = parseInt(prompt('Гонорар ' + f2.fullName + ':'));

    if (!purse1 || !purse2 || (p.budget || 0) < (purse1 + purse2)) {
        alert('Недостаточно средств в бюджете!');
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

    if (socket) {
        socket.emit('updateEvent', evt);
        socket.emit('updatePromotion', p);
    }

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
    html += '<div class="stat-card"><h3>Баланс</h3><div class="stat-value">🪙' + (p.budget || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Доходы</h3><div class="stat-value" style="color:var(--green);">🪙' + (p.revenue || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Расходы</h3><div class="stat-value" style="color:var(--red);">🪙' + (p.expenses || 0) + '</div></div>';
    html += '</div>';
    return html;
}
