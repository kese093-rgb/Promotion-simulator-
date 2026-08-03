// ============================================
// ЛОГИКА БОЙЦА
// ============================================

// ============================================
// НАВЫКИ
// ============================================
function getBaseStats(style, age) {
    var s = { boxing: 0, wrestling: 0, submission: 0, kick: 0, speed: 0, stamina: 0, strength: 0 };
    if (style === 'boxing') {
        if (age <= 23) { s.boxing = 6; s.wrestling = 1; s.submission = 1; s.kick = 1; s.speed = 6; s.stamina = 6; s.strength = 5; }
        else { s.boxing = 10; s.wrestling = 1; s.submission = 1; s.kick = 1; s.speed = 10; s.stamina = 10; s.strength = 5; }
    } else if (style === 'wrestling') {
        if (age <= 23) { s.boxing = 1; s.wrestling = 6; s.submission = 6; s.kick = 1; s.speed = 5; s.stamina = 6; s.strength = 6; }
        else { s.boxing = 1; s.wrestling = 10; s.submission = 10; s.kick = 1; s.speed = 5; s.stamina = 10; s.strength = 10; }
    } else if (style === 'kickboxing') {
        if (age <= 23) { s.boxing = 5; s.wrestling = 1; s.submission = 1; s.kick = 7; s.speed = 5; s.stamina = 5; s.strength = 5; }
        else { s.boxing = 6; s.wrestling = 1; s.submission = 1; s.kick = 10; s.speed = 10; s.stamina = 6; s.strength = 6; }
    }
    return s;
}

function updatePreviewStats() {
    var styleEl = document.getElementById('f-style');
    var ageEl = document.getElementById('f-age');
    if (!styleEl || !ageEl) return;
    var style = styleEl.value;
    var age = parseInt(ageEl.value);
    var s = getBaseStats(style, age);
    var pv = document.getElementById('preview-stats');
    if (pv) {
        pv.innerHTML = '<strong>Навыки:</strong> Бокс:' + s.boxing + ' Борьба:' + s.wrestling + ' Самбишн:' + s.submission + ' Удар ногой:' + s.kick + ' Скорость:' + s.speed + ' Выносливость:' + s.stamina + ' Сила:' + s.strength;
    }
}

// ============================================
// СОХРАНЕНИЯ
// ============================================
function saveCareerLocally() {
    var f = findMyFighter();
    if (!f) return;
    var saveData = {
        fighter: f,
        lastTrainTime: lastTrainTime,
        timestamp: Date.now()
    };
    localStorage.setItem('ps_career_slot', JSON.stringify(saveData));
}

function loadCareerLocally() {
    var data = localStorage.getItem('ps_career_slot');
    if (!data) return null;
    try {
        var saveData = JSON.parse(data);
        lastTrainTime = saveData.lastTrainTime || {};
        return saveData.fighter;
    } catch(e) {
        return null;
    }
}

function hasCareerSave() {
    return localStorage.getItem('ps_career_slot') !== null;
}

// ============================================
// СОЗДАНИЕ БОЙЦА
// ============================================
function createMyFighter() {
    var nameEl = document.getElementById('f-name');
    var surnameEl = document.getElementById('f-surname');
    var ageEl = document.getElementById('f-age');
    var countryEl = document.getElementById('f-country');
    var styleEl = document.getElementById('f-style');

    if (!nameEl || !surnameEl) { alert('Ошибка формы!'); return; }

    var name = nameEl.value.trim();
    var surname = surnameEl.value.trim();
    if (!name || !surname) { alert('Введите имя и фамилию!'); return; }

    var age = parseInt(ageEl.value);
    var country = countryEl.value;
    var style = styleEl.value;
    var stats = getBaseStats(style, age);
    var playerName = name + ' ' + surname;

    autoConnect(playerName);

    setTimeout(function() {
        if (!socket || !myPlayer || !myPlayer.id) {
            alert('Сервер не отвечает. Подождите и попробуйте снова.');
            return;
        }

        var fighterData = {
            firstName: name, lastName: surname, age: age, country: country, baseStyle: style,
            boxing: stats.boxing, wrestling: stats.wrestling, submission: stats.submission,
            kick: stats.kick, speed: stats.speed, stamina: stats.stamina, strength: stats.strength
        };

        socket.emit('createFighter', fighterData);
        myMode = 'fighter';

        // Ждём подтверждения от сервера и сохраняем локально
        setTimeout(function() {
            var f = findMyFighter();
            if (f) saveCareerLocally();
        }, 1000);
    }, 800);
}

// ============================================
// ОТРИСОВКА БОЙЦА
// ============================================
function renderFighterOverview(f) {
    var rec = f.records || { wins: 0, losses: 0, ko: 0 };
    var html = '<h2>📊 ' + f.fullName + (f.nickname ? ' "' + f.nickname + '"' : '') + '</h2>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><h3>⚡ Энергия</h3><div class="stat-value">' + (f.energy || 100) + '/' + (f.maxEnergy || 100) + '</div><div class="stat-bar"><div class="stat-bar-fill bar-energy" style="width:' + ((f.energy || 100) / (f.maxEnergy || 100) * 100) + '%"></div></div></div>';
    html += '<div class="stat-card"><h3>🔥 Прайм</h3><div class="stat-value">' + (f.prime || 0) + '/100</div><div class="stat-bar"><div class="stat-bar-fill bar-prime" style="width:' + (f.prime || 0) + '%"></div></div></div>';
    html += '<div class="stat-card"><h3>📢 Хайп</h3><div class="stat-value">' + (f.hype || 0) + '/100</div><div class="stat-bar"><div class="stat-bar-fill bar-hype" style="width:' + (f.hype || 0) + '%"></div></div></div>';
    html += '<div class="stat-card"><h3>🏆 Рекорд</h3><div class="stat-value" style="font-size:18px;">' + rec.wins + 'W-' + rec.losses + 'L-' + (rec.ko || 0) + 'KO</div></div>';
    html += '<div class="stat-card"><h3>🪙 Монеты</h3><div class="stat-value">🪙' + (f.coins || 0) + '</div></div>';
    html += '</div>';
    html += '<h3 style="margin-top:15px;">🥊 Навыки</h3><div class="stat-grid">';
    html += '<div class="stat-card"><h3>Бокс</h3><div class="stat-value">' + (f.boxing || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Борьба</h3><div class="stat-value">' + (f.wrestling || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Самбишн</h3><div class="stat-value">' + (f.submission || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Удар ногой</h3><div class="stat-value">' + (f.kick || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Скорость</h3><div class="stat-value">' + (f.speed || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Выносливость</h3><div class="stat-value">' + (f.stamina || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Сила</h3><div class="stat-value">' + (f.strength || 0) + '</div></div>';
    html += '</div>';
    if (f.currentPromotionId) {
        var promo = null;
        for (var i = 0; i < gameData.promotions.length; i++) {
            if (gameData.promotions[i].id === f.currentPromotionId) { promo = gameData.promotions[i]; break; }
        }
        if (promo) html += '<p style="margin-top:10px;color:var(--green);">✅ В ростере: <strong>' + promo.name + '</strong></p>';
    } else {
        html += '<p style="margin-top:10px;color:var(--red);">❌ Нет промоушна. Подайте заявку во вкладке "Промоушны".</p>';
    }
    html += '<button class="btn btn-green btn-large" onclick="saveCareerLocally();alert(\'Карьера сохранена!\');">💾 Сохранить карьеру</button>';
    return html;
}

function renderAllFightersFull() {
    var fighters = gameData.fighters;
    var html = '<h2>👥 Все бойцы (' + fighters.length + ')</h2>';
    html += '<table class="data-table"><thead><tr><th>Боец</th><th>Страна</th><th>Стиль</th><th>Рекорд</th><th>Хайп</th><th>Действие</th></tr></thead><tbody>';
    for (var i = 0; i < fighters.length; i++) {
        var f = fighters[i];
        var rec = f.records || { wins: 0, losses: 0 };
        html += '<tr><td><strong>' + f.fullName + '</strong>' + (f.isBot ? ' 🤖' : '') + '</td><td>' + f.country + '</td><td>' + f.baseStyle + '</td><td>' + rec.wins + '-' + rec.losses + '</td><td>' + (f.hype || 0) + '</td><td>';
        if (myMode === 'promoter' && f.id !== (findMyPromotion() ? findMyPromotion().ownerId : null)) {
            var promo = findMyPromotion();
            if (promo && promo.roster && promo.roster.indexOf(f.id) === -1) {
                html += '<button class="btn btn-primary btn-small" onclick="signFighter(\'' + f.id + '\')">Подписать</button>';
            } else if (promo && promo.roster && promo.roster.indexOf(f.id) !== -1) {
                html += '<span class="badge badge-green">В ростере</span>';
            }
        }
        html += '</td></tr>';
    }
    html += '</tbody></table>';
    return html;
}

// ============================================
// ПОДПИСАНИЕ БОЙЦА (для менеджера)
// ============================================
function signFighter(fighterId) {
    var p = findMyPromotion();
    if (!p) { alert('Сначала создайте промоушн!'); return; }
    var f = null;
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === fighterId) { f = gameData.fighters[i]; break; }
    }
    if (!f) return;
    var amount = parseInt(prompt('Сумма контракта для ' + f.fullName + ':\nСлабый: 10-50 | Средний: 50-150 | Сильный: 150-300'));
    if (!amount || amount <= 0 || p.budget < amount) { alert('Недостаточно средств или неверная сумма!'); return; }

    p.budget -= amount;
    p.expenses = (p.expenses || 0) + amount;
    if (!p.roster) p.roster = [];
    p.roster.push(f.id);
    f.currentPromotionId = p.id;
    f.coins = (f.coins || 0) + amount;

    if (socket) {
        socket.emit('updateFighter', f);
        socket.emit('updatePromotion', p);
    }
    showTab('allfighters');
    alert(f.fullName + ' подписан за 🪙' + amount + '!');
}

// ============================================
// ТРЕНИРОВКИ
// ============================================
function renderTraining() {
    var f = findMyFighter();
    if (!f) return '<p style="color:var(--text2);">Создайте бойца!</p>';

    var skills = ['boxing','wrestling','submission','kick','speed','stamina','strength'];
    var names = ['Бокс','Борьба','Самбишн','Удар ногой','Скорость','Выносливость','Сила'];
    var html = '<h2>🏋️ Тренировки</h2><p style="color:var(--text2);">⚡ Энергия: ' + (f.energy || 100) + '/' + (f.maxEnergy || 100) + ' | Тренировка: -10 энергии | КД: 2 часа</p><div class="stat-grid">';

    var now = Date.now();
    for (var i = 0; i < skills.length; i++) {
        var canTrain = (f.energy || 100) >= 10;
        var cdText = '';
        var key = f.id + '_' + skills[i];
        if (lastTrainTime[key] && (now - lastTrainTime[key]) < 7200000) {
            canTrain = false;
            cdText = '<br><span style="color:var(--red);font-size:10px;">КД: ' + Math.ceil((7200000 - (now - lastTrainTime[key])) / 60000) + ' мин</span>';
        }
        html += '<div class="stat-card"><h3>' + names[i] + '</h3><div class="stat-value">' + (f[skills[i]] || 0) + '</div>' + cdText + '<button class="btn btn-small" ' + (!canTrain ? 'disabled style="opacity:0.4;"' : '') + ' onclick="trainSkill(\'' + skills[i] + '\')">+1</button></div>';
    }
    html += '</div>';
    return html;
}

function trainSkill(skill) {
    var f = findMyFighter();
    if (!f || (f.energy || 100) < 10) { alert('Недостаточно энергии!'); return; }
    var now = Date.now();
    var key = f.id + '_' + skill;
    if (lastTrainTime[key] && (now - lastTrainTime[key]) < 7200000) { alert('Подождите, навык на перезарядке!'); return; }

    f[skill] = Math.min(100, (f[skill] || 0) + 1);
    f.energy = Math.max(0, (f.energy || 100) - 10);
    f.prime = Math.min(100, (f.prime || 0) + 1);
    lastTrainTime[key] = now;

    if (socket) socket.emit('updateFighter', f);
    saveCareerLocally();
    showTab('training');
}

// ============================================
// БОИ
// ============================================
var fightTemplates = {
    box: ['{a} выбрасывает мощный джеб!', '{a} бьёт точный кросс! {d} пошатнулся!', '{a} работает серией по корпусу.', '{a} наносит хук слева!'],
    wrestle: ['{a} проходит в ноги!', '{a} прижимает {d} к сетке.', '{a} выполняет тейкдаун! {d} на спине!', '{a} контролирует в партере.'],
    kick: ['{a} бьёт хай-кик!', '{a} наносит лоу-кик по ноге {d}.', '{a} пробивает мидл-кик в корпус.', '{a} комбинирует руки и ноги!'],
    submission: ['{a} пытается выйти на болевой!', '{a} ищет удушающий! {d} защищается.', '{a} забрал спину!', '{a} плотно держит позицию.'],
    defense: ['{d} отлично защищается!', '{d} уходит от ударов.', '{d} блокирует проход.', '{d} контратакует!']
};

function getCommentary(a, d, type) {
    var t = fightTemplates[type] || fightTemplates['box'];
    return t[Math.floor(Math.random() * t.length)].replace('{a}', '<strong>' + a + '</strong>').replace('{d}', '<strong>' + d + '</strong>');
}

function renderFights() {
    var f = findMyFighter();
    if (!f) return '<p style="color:var(--text2);">Создайте бойца!</p>';
    var rec = f.records || { wins: 0, losses: 0 };
    var html = '<h2>🥊 Бои</h2><p style="color:var(--text2);">Ваш рекорд: <strong>' + rec.wins + 'W-' + rec.losses + 'L-' + (rec.ko || 0) + 'KO</strong></p>';
    html += '<p style="color:var(--text2);">Выберите соперника:</p><div class="stat-grid">';

    var opponents = [];
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id !== f.id && !gameData.fighters[i].retired) {
            opponents.push(gameData.fighters[i]);
        }
    }

    if (opponents.length === 0) {
        html += '<p style="color:var(--text2);">Нет доступных соперников.</p>';
    } else {
        for (var i = 0; i < Math.min(opponents.length, 12); i++) {
            var o = opponents[i];
            var orec = o.records || { wins: 0, losses: 0 };
            html += '<div class="stat-card"><h3>' + o.fullName + (o.isBot ? ' 🤖' : '') + '</h3>';
            html += '<p style="font-size:12px;">' + o.baseStyle + ' | ' + orec.wins + '-' + orec.losses + ' | Хайп: ' + (o.hype || 0) + '</p>';
            html += '<button class="btn btn-primary btn-small" onclick="startFight(\'' + o.id + '\')">⚔️ Драться</button></div>';
        }
    }
    html += '</div>';
    return html;
}

function startFight(oppId) {
    var area = document.getElementById('content-area');
    if (!area) return;
    area.innerHTML = '<h2>🥊 Тактика на бой</h2>' +
        '<select id="fight-tactic" class="input" style="margin:10px 0;">' +
        '<option value="balance">⚖️ Баланс</option>' +
        '<option value="box">🥊 Боксировать</option>' +
        '<option value="wrestle">🤼 Бороться</option>' +
        '<option value="counter_box">🛡️ Контр-атаки + Бокс</option>' +
        '<option value="counter_wrestle">🛡️ Контр-атаки + Борьба</option>' +
        '</select>' +
        '<button class="btn btn-primary btn-large" onclick="watchFight(\'' + oppId + '\')">👀 Смотреть бой</button>' +
        '<button class="btn btn-large" onclick="skipFight(\'' + oppId + '\')" style="margin-top:5px;">⏩ Пропустить</button>';
}

function resolveFight(oppId, tactic) {
    var f = findMyFighter();
    var o = null;
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === oppId) { o = gameData.fighters[i]; break; }
    }
    if (!f || !o) return null;

    var oppTactic = o.tactic || ['balance','box','wrestle'][Math.floor(Math.random() * 3)];

    var s1 = 0, s2 = 0;
    if (tactic === 'box') s1 = (f.boxing||0) * 2 + (f.speed||0) + (f.strength||0);
    else if (tactic === 'wrestle') s1 = (f.wrestling||0) * 2 + (f.strength||0) + (f.submission||0);
    else if (tactic === 'counter_box') s1 = (f.boxing||0) + (f.speed||0) + (f.submission||0) + 5;
    else if (tactic === 'counter_wrestle') s1 = (f.wrestling||0) + (f.strength||0) + (f.submission||0) + 5;
    else s1 = (f.boxing||0) + (f.wrestling||0) + (f.speed||0);

    if (oppTactic === 'box') s2 = (o.boxing||0) * 2 + (o.speed||0) + (o.strength||0);
    else if (oppTactic === 'wrestle') s2 = (o.wrestling||0) * 2 + (o.strength||0) + (o.submission||0);
    else if (oppTactic === 'counter_box') s2 = (o.boxing||0) + (o.speed||0) + (o.submission||0) + 5;
    else if (oppTactic === 'counter_wrestle') s2 = (o.wrestling||0) + (o.strength||0) + (o.submission||0) + 5;
    else s2 = (o.boxing||0) + (o.wrestling||0) + (o.speed||0);

    s1 += (f.prime||0)/10 + (f.hype||0)/20 + Math.floor(Math.random()*7) - 3;
    s2 += (o.prime||0)/10 + (o.hype||0)/20 + Math.floor(Math.random()*7) - 3;
    s1 *= (f.energy||100)/100;
    s2 *= (o.energy||100)/100;

    var commentary = ['🥊 ' + f.fullName + ' (тактика: ' + tactic + ') vs ' + o.fullName + ' (тактика: ' + oppTactic + ')'];
    var rounds = 5 + Math.floor(Math.random() * 4);
    for (var r = 0; r < rounds; r++) {
        var actor = Math.random() < (s1/(s1+s2)) ? f : o;
        var defender = actor.id === f.id ? o : f;
        var types = ['box','wrestle'];
        if ((actor.kick||0) > 5) types.push('kick');
        if ((actor.submission||0) > 5) types.push('submission');
        if (Math.random() < 0.3) types.push('defense');
        commentary.push(getCommentary(actor.fullName, defender.fullName, types[Math.floor(Math.random()*types.length)]));
    }

    var won = s1 > s2;
    var ko = Math.abs(s1-s2) > 15;
    if (ko && won) commentary.push('💥 НОКАУТ! ' + f.fullName + ' побеждает!');
    else if (ko && !won) commentary.push('💥 НОКАУТ! ' + o.fullName + ' побеждает!');
    else if (won) commentary.push('🏆 ' + f.fullName + ' побеждает решением судей!');
    else commentary.push('💔 ' + o.fullName + ' побеждает решением судей!');

    return { winner: won ? f : o, loser: won ? o : f, ko: ko, commentary: commentary };
}

function watchFight(oppId) {
    var tacticEl = document.getElementById('fight-tactic');
    if (!tacticEl) return;
    var tactic = tacticEl.value;
    var result = resolveFight(oppId, tactic);
    if (!result) return;

    var area = document.getElementById('content-area');
    area.innerHTML = '<h2>🥊 Бой</h2><div class="fight-log" id="fight-log"></div>';
    var i = 0;

    function nextLine() {
        if (i < result.commentary.length) {
            var log = document.getElementById('fight-log');
            if (log) {
                log.innerHTML += '<p>' + result.commentary[i] + '</p>';
                log.scrollTop = log.scrollHeight;
            }
            i++;
            setTimeout(nextLine, 2000);
        } else {
            applyFightResult(result);
            area.innerHTML += '<p style="font-size:18px;margin-top:10px;">' + (result.winner.id === findMyFighter().id ? '🏆 ПОБЕДА!' : '💔 ПОРАЖЕНИЕ') + '</p>';
            area.innerHTML += '<button class="btn btn-primary btn-large" onclick="showTab(\'fights\')">Продолжить</button>';
        }
    }
    setTimeout(nextLine, 500);
}

function skipFight(oppId) {
    var tacticEl = document.getElementById('fight-tactic');
    if (!tacticEl) return;
    var tactic = tacticEl.value;
    var result = resolveFight(oppId, tactic);
    if (!result) return;
    applyFightResult(result);
    showTab('fights');
    alert(result.commentary[result.commentary.length - 1]);
}

function applyFightResult(result) {
    var w = result.winner;
    var l = result.loser;
    if (!w.records) w.records = { wins: 0, losses: 0, ko: 0 };
    if (!l.records) l.records = { wins: 0, losses: 0, ko: 0 };
    w.records.wins++;
    l.records.losses++;
    if (result.ko) w.records.ko = (w.records.ko || 0) + 1;
    w.energy = Math.max(0, (w.energy || 100) - 20);
    l.energy = Math.max(0, (l.energy || 100) - 35);
    w.prime = Math.min(100, (w.prime || 0) + 30);
    l.prime = Math.max(0, (l.prime || 0) - 30);
    w.hype = Math.min(100, (w.hype || 0) + (result.ko ? 15 : 10));
    w.coins = (w.coins || 0) + Math.floor(Math.random() * 150) + 50;
    l.coins = (l.coins || 0) + Math.floor(Math.random() * 30) + 10;
    if (socket) { socket.emit('updateFighter', w); socket.emit('updateFighter', l); }
    saveCareerLocally();
}

// ============================================
// МАГАЗИН
// ============================================
function renderShop() {
    var f = findMyFighter();
    if (!f) return '<p style="color:var(--text2);">Создайте бойца!</p>';
    var html = '<h2>🛒 Магазин</h2><p style="margin-bottom:15px;">Ваши монеты: 🪙 <strong>' + (f.coins || 0) + '</strong></p><div class="stat-grid">';
    html += '<div class="stat-card"><h3>Прозвище</h3><p>🪙 1000</p><button class="btn btn-gold btn-small" onclick="buyNickname()">Купить</button></div>';
    html += '<div class="stat-card"><h3>Вещь (+10 хайп)</h3><p>🪙 1500</p><button class="btn btn-gold btn-small" onclick="buyItem()">Купить</button></div>';
    html += '<div class="stat-card"><h3>Пожертвование (+5 хайп)</h3><p>🪙 1000</p><button class="btn btn-green btn-small" onclick="buyDonation()">Купить</button></div>';
    html += '<div class="stat-card"><h3>Шорты (+3 хайп)</h3><p>🪙 500</p><button class="btn btn-green btn-small" onclick="buyShorts()">Купить</button></div>';
    html += '</div>';
    return html;
}

function buyNickname() { var f = findMyFighter(); if (!f || (f.coins||0) < 1000) { alert('Недостаточно монет!'); return; } var n = prompt('Прозвище:'); if (!n) return; f.coins -= 1000; f.nickname = n; if (socket) socket.emit('updateFighter', f); saveCareerLocally(); showTab('shop'); alert('Куплено!'); }
function buyItem() { var f = findMyFighter(); if (!f || (f.coins||0) < 1500) { alert('Недостаточно монет!'); return; } f.coins -= 1500; f.hype = Math.min(100, (f.hype||0) + 10); if (socket) socket.emit('updateFighter', f); saveCareerLocally(); showTab('shop'); alert('+10 хайпа!'); }
function buyDonation() { var f = findMyFighter(); if (!f || (f.coins||0) < 1000) { alert('Недостаточно монет!'); return; } f.coins -= 1000; f.hype = Math.min(100, (f.hype||0) + 5); if (socket) socket.emit('updateFighter', f); saveCareerLocally(); showTab('shop'); alert('+5 хайпа!'); }
function buyShorts() { var f = findMyFighter(); if (!f || (f.coins||0) < 500) { alert('Недостаточно монет!'); return; } f.coins -= 500; f.hype = Math.min(100, (f.hype||0) + 3); if (socket) socket.emit('updateFighter', f); saveCareerLocally(); showTab('shop'); alert('+3 хайпа!'); }

// ============================================
// ВОССТАНОВЛЕНИЕ ЭНЕРГИИ
// ============================================
setInterval(function() {
    var f = findMyFighter();
    if (f && (f.energy || 100) < (f.maxEnergy || 100)) {
        f.energy = Math.min(f.maxEnergy || 100, (f.energy || 100) + 5);
    }
}, 30000);
