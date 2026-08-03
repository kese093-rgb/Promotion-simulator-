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
    var style = document.getElementById('f-style') ? document.getElementById('f-style').value : 'boxing';
    var age = parseInt(document.getElementById('f-age') ? document.getElementById('f-age').value : 20);
    var s = getBaseStats(style, age);
    var pv = document.getElementById('preview-stats');
    if (pv) {
        pv.innerHTML = '<strong>Навыки:</strong> Бокс:' + s.boxing + ' Борьба:' + s.wrestling + ' Самбишн:' + s.submission + ' Удар ногой:' + s.kick + ' Скорость:' + s.speed + ' Выносливость:' + s.stamina + ' Сила:' + s.strength;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var fs = document.getElementById('f-style');
    var fa = document.getElementById('f-age');
    if (fs) fs.addEventListener('change', updatePreviewStats);
    if (fa) fa.addEventListener('change', updatePreviewStats);
    updatePreviewStats();
});

// ============================================
// СОЗДАНИЕ БОЙЦА
// ============================================
function createMyFighter() {
    var name = document.getElementById('f-name').value.trim();
    var surname = document.getElementById('f-surname').value.trim();
    if (!name || !surname) { alert('Введите имя и фамилию!'); return; }
    var age = parseInt(document.getElementById('f-age').value);
    var country = document.getElementById('f-country').value;
    var style = document.getElementById('f-style').value;
    var stats = getBaseStats(style, age);
    var playerName = name + ' ' + surname;

    autoConnect(playerName);

    setTimeout(function() {
        if (!socket || !myPlayer || !myPlayer.id) {
            alert('Не удалось подключиться к серверу. Попробуйте ещё раз.');
            return;
        }
        socket.emit('createFighter', {
            firstName: name, lastName: surname, age: age, country: country, baseStyle: style,
            boxing: stats.boxing, wrestling: stats.wrestling, submission: stats.submission,
            kick: stats.kick, speed: stats.speed, stamina: stats.stamina, strength: stats.strength
        });
        myMode = 'fighter';
    }, 800);
}

// ============================================
// ОТРИСОВКА БОЙЦА
// ============================================
function renderFighterOverview(f) {
    var rec = f.records || { wins: 0, losses: 0, ko: 0 };
    var html = '<h2>📊 ' + f.fullName + '</h2>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><h3>Энергия</h3><div class="stat-value">' + (f.energy || 100) + '/' + (f.maxEnergy || 100) + '</div><div class="stat-bar"><div class="stat-bar-fill bar-energy" style="width:' + ((f.energy || 100) / (f.maxEnergy || 100) * 100) + '%"></div></div></div>';
    html += '<div class="stat-card"><h3>Прайм</h3><div class="stat-value">' + (f.prime || 0) + '/100</div><div class="stat-bar"><div class="stat-bar-fill bar-prime" style="width:' + (f.prime || 0) + '%"></div></div></div>';
    html += '<div class="stat-card"><h3>Хайп</h3><div class="stat-value">' + (f.hype || 0) + '/100</div><div class="stat-bar"><div class="stat-bar-fill bar-hype" style="width:' + (f.hype || 0) + '%"></div></div></div>';
    html += '<div class="stat-card"><h3>Рекорд</h3><div class="stat-value" style="font-size:18px;">' + rec.wins + 'W-' + rec.losses + 'L-' + (rec.ko || 0) + 'KO</div></div>';
    html += '<div class="stat-card"><h3>Монеты</h3><div class="stat-value">🪙' + (f.coins || 0) + '</div></div>';
    html += '</div>';
    html += '<h3 style="margin-top:15px;">Навыки</h3><div class="stat-grid">';
    html += '<div class="stat-card"><h3>Бокс</h3><div class="stat-value">' + (f.boxing || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Борьба</h3><div class="stat-value">' + (f.wrestling || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Самбишн</h3><div class="stat-value">' + (f.submission || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Удар ногой</h3><div class="stat-value">' + (f.kick || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Скорость</h3><div class="stat-value">' + (f.speed || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Выносливость</h3><div class="stat-value">' + (f.stamina || 0) + '</div></div>';
    html += '<div class="stat-card"><h3>Сила</h3><div class="stat-value">' + (f.strength || 0) + '</div></div>';
    html += '</div>';
    return html;
}

function renderAllFightersFull() {
    var fighters = gameData.fighters;
    var html = '<h2>👥 Все бойцы (' + fighters.length + ')</h2>';
    html += '<table class="data-table"><thead><tr><th>Боец</th><th>Страна</th><th>Стиль</th><th>Рекорд</th><th>Хайп</th><th>Прайм</th></tr></thead><tbody>';
    fighters.forEach(function(f) {
        var rec = f.records || { wins: 0, losses: 0 };
        html += '<tr><td><strong>' + f.fullName + '</strong>' + (f.isBot ? ' 🤖' : '') + '</td><td>' + f.country + '</td><td>' + f.baseStyle + '</td><td>' + rec.wins + '-' + rec.losses + '</td><td>' + (f.hype || 0) + '</td><td>' + (f.prime || 0) + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
}

// ============================================
// ТРЕНИРОВКИ
// ============================================
function renderTraining() {
    var f = findMyFighter();
    if (!f) return '<p style="color:var(--text2);">Создайте бойца!</p>';

    var skills = ['boxing','wrestling','submission','kick','speed','stamina','strength'];
    var names = ['Бокс','Борьба','Самбишн','Удар ногой','Скорость','Выносливость','Сила'];
    var html = '<h2>🏋️ Тренировки</h2><p style="color:var(--text2);">Энергия: ' + (f.energy || 100) + '/' + (f.maxEnergy || 100) + ' | Тренировка: -10 энергии | КД: 2 часа на навык</p><div class="stat-grid">';

    var now = Date.now();
    for (var i = 0; i < skills.length; i++) {
        var canTrain = (f.energy || 100) >= 10;
        var cdText = '';
        var key = f.id + '_' + skills[i];
        if (lastTrainTime[key] && (now - lastTrainTime[key]) < 7200000) {
            canTrain = false;
            cdText = '<br><span style="color:var(--red);font-size:10px;">Доступно через ' + Math.ceil((7200000 - (now - lastTrainTime[key])) / 60000) + ' мин</span>';
        }
        html += '<div class="stat-card"><h3>' + names[i] + '</h3><div class="stat-value">' + (f[skills[i]] || 0) + '</div>' + cdText + '<button class="btn btn-small" ' + (!canTrain ? 'disabled style="opacity:0.4;"' : '') + ' onclick="trainSkill(\'' + skills[i] + '\')">+1</button></div>';
    }
    html += '</div>';
    return html;
}

function trainSkill(skill) {
    var f = findMyFighter();
    if (!f || (f.energy || 100) < 10) return;
    var now = Date.now();
    var key = f.id + '_' + skill;
    if (lastTrainTime[key] && (now - lastTrainTime[key]) < 7200000) return;

    f[skill] = Math.min(100, (f[skill] || 0) + 1);
    f.energy = Math.max(0, (f.energy || 100) - 10);
    f.prime = Math.min(100, (f.prime || 0) + 1);
    lastTrainTime[key] = now;

    if (socket) socket.emit('updateFighter', f);
    showTab('training');
}

// ============================================
// БОИ
// ============================================
var fightTemplates = {
    box: ['{a} выбрасывает мощный джеб!', '{a} бьёт точный кросс! {d} пошатнулся!', '{a} работает серией по корпусу.'],
    wrestle: ['{a} проходит в ноги!', '{a} прижимает {d} к сетке.', '{a} выполняет тейкдаун! {d} на спине!'],
    kick: ['{a} бьёт хай-кик!', '{a} наносит лоу-кик по ноге {d}.', '{a} пробивает мидл-кик в корпус.'],
    submission: ['{a} пытается выйти на болевой!', '{a} ищет удушающий! {d} защищается.', '{a} забрал спину!'],
    defense: ['{d} отлично защищается!', '{d} уходит от ударов.', '{d} блокирует проход.']
};

function getCommentary(a, d, type) {
    var t = fightTemplates[type] || fightTemplates['box'];
    return t[Math.floor(Math.random() * t.length)].replace('{a}', '<strong>' + a + '</strong>').replace('{d}', '<strong>' + d + '</strong>');
}

function renderFights() {
    var f = findMyFighter();
    if (!f) return '<p style="color:var(--text2);">Создайте бойца!</p>';
    var rec = f.records || { wins: 0, losses: 0 };
    var html = '<h2>🥊 Бои</h2><p style="color:var(--text2);">Ваш рекорд: ' + rec.wins + 'W-' + rec.losses + 'L</p><p style="color:var(--text2);">Выберите соперника:</p>';
    html += '<div class="stat-grid">';
    var opponents = gameData.fighters.filter(function(o) { return o.id !== f.id && !o.retired; });
    if (opponents.length === 0) {
        html += '<p style="color:var(--text2);">Нет доступных соперников.</p>';
    } else {
        opponents.slice(0, 12).forEach(function(o) {
            var orec = o.records || { wins: 0, losses: 0 };
            html += '<div class="stat-card"><h3>' + o.fullName + (o.isBot ? ' 🤖' : '') + '</h3><p style="font-size:11px;">' + o.baseStyle + ' | ' + orec.wins + '-' + orec.losses + ' | Хайп: ' + (o.hype || 0) + '</p><button class="btn btn-primary btn-small" onclick="startFight(\'' + o.id + '\')">Драться</button></div>';
        });
    }
    html += '</div>';
    return html;
}

function startFight(oppId) {
    var area = document.getElementById('content-area');
    area.innerHTML = '<h2>🥊 Тактика на бой</h2><select id="fight-tactic" class="input" style="margin:10px 0;"><option value="balance">⚖️ Баланс</option><option value="box">🥊 Боксировать</option><option value="wrestle">🤼 Бороться</option><option value="counter_box">🛡️ Контр-атаки + Бокс</option><option value="counter_wrestle">🛡️ Контр-атаки + Борьба</option></select><button class="btn btn-primary btn-large" onclick="watchFight(\'' + oppId + '\')">👀 Смотреть бой</button><button class="btn btn-large" onclick="skipFight(\'' + oppId + '\')" style="margin-top:5px;">⏩ Пропустить</button>';
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

    var commentary = ['🥊 ' + f.fullName + ' (' + tactic + ') vs ' + o.fullName + ' (' + oppTactic + ')'];
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
    else commentary.push('🏆 ' + o.fullName + ' побеждает решением судей!');

    return { winner: won ? f : o, loser: won ? o : f, ko: ko, commentary: commentary };
}

function watchFight(oppId) {
    var tactic = document.getElementById('fight-tactic').value;
    var result = resolveFight(oppId, tactic);
    if (!result) return;
    var area = document.getElementById('content-area');
    area.innerHTML = '<h2>🥊 Бой</h2><div class="fight-log" id="fight-log"></div>';
    var i = 0;
    function next() {
        if (i < result.commentary.length) {
            document.getElementById('fight-log').innerHTML += '<p>' + result.commentary[i] + '</p>';
            document.getElementById('fight-log').scrollTop = document.getElementById('fight-log').scrollHeight;
            i++;
            setTimeout(next, 2000);
        } else {
            applyFightResult(result);
            area.innerHTML += '<button class="btn btn-primary btn-large" onclick="showTab(\'fights\')">Продолжить</button>';
        }
    }
    setTimeout(next, 500);
}

function skipFight(oppId) {
    var tactic = document.getElementById('fight-tactic').value;
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
}

// ============================================
// МАГАЗИН
// ============================================
function renderShop() {
    var f = findMyFighter();
    if (!f) return '<p style="color:var(--text2);">Создайте бойца!</p>';
    var html = '<h2>🛒 Магазин</h2><p style="margin-bottom:15px;">Ваши монеты: 🪙 <strong>' + (f.coins || 0) + '</strong></p>';
    html += '<div class="stat-grid">';
    html += '<div class="stat-card"><h3>Прозвище</h3><p style="font-size:12px;">Уникальное прозвище</p><p>🪙 1000</p><button class="btn btn-gold btn-small" onclick="buyNickname()">Купить</button></div>';
    html += '<div class="stat-card"><h3>Дорогая вещь</h3><p style="font-size:12px;">+10 к хайпу</p><p>🪙 1500</p><button class="btn btn-gold btn-small" onclick="buyItem()">Купить</button></div>';
    html += '<div class="stat-card"><h3>Пожертвование</h3><p style="font-size:12px;">+5 к хайпу</p><p>🪙 1000</p><button class="btn btn-green btn-small" onclick="buyDonation()">Купить</button></div>';
    html += '<div class="stat-card"><h3>Именные шорты</h3><p style="font-size:12px;">+3 к хайпу</p><p>🪙 500</p><button class="btn btn-green btn-small" onclick="buyShorts()">Купить</button></div>';
    html += '</div>';
    return html;
}

function buyNickname() {
    var f = findMyFighter();
    if (!f || (f.coins || 0) < 1000) { alert('Недостаточно монет!'); return; }
    var nick = prompt('Введите прозвище:');
    if (!nick) return;
    f.coins -= 1000;
    f.nickname = nick;
    if (socket) socket.emit('updateFighter', f);
    showTab('shop');
    alert('Прозвище "' + nick + '" куплено!');
}

function buyItem() {
    var f = findMyFighter();
    if (!f || (f.coins || 0) < 1500) { alert('Недостаточно монет!'); return; }
    f.coins -= 1500;
    f.hype = Math.min(100, (f.hype || 0) + 10);
    if (socket) socket.emit('updateFighter', f);
    showTab('shop');
    alert('Вещь куплена! +10 к хайпу.');
}

function buyDonation() {
    var f = findMyFighter();
    if (!f || (f.coins || 0) < 1000) { alert('Недостаточно монет!'); return; }
    f.coins -= 1000;
    f.hype = Math.min(100, (f.hype || 0) + 5);
    if (socket) socket.emit('updateFighter', f);
    showTab('shop');
    alert('Пожертвование сделано! +5 к хайпу.');
}

function buyShorts() {
    var f = findMyFighter();
    if (!f || (f.coins || 0) < 500) { alert('Недостаточно монет!'); return; }
    f.coins -= 500;
    f.hype = Math.min(100, (f.hype || 0) + 3);
    if (socket) socket.emit('updateFighter', f);
    showTab('shop');
    alert('Именные шорты куплены! +3 к хайпу.');
}

// ============================================
// ВОССТАНОВЛЕНИЕ ЭНЕРГИИ
// ============================================
setInterval(function() {
    var f = findMyFighter();
    if (f && (f.energy || 100) < (f.maxEnergy || 100)) {
        f.energy = Math.min(f.maxEnergy || 100, (f.energy || 100) + 5);
    }
}, 30000);
