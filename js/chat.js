// ============================================
// ЧАТ И УВЕДОМЛЕНИЯ
// ============================================

// ============================================
// ЧАТ
// ============================================
function sendChat() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if (!text || !socket || !myPlayer) return;
    socket.emit('chatMessage', { name: myPlayer.name, text: text });
    input.value = '';
}

function addChatMessage(msg) {
    gameData.messages.push(msg);
    if (gameData.messages.length > 200) gameData.messages.shift();
    renderChatMessages();
}

function renderChatMessages() {
    var container = document.getElementById('chat-messages');
    if (!container) return;
    var html = '';
    var msgs = gameData.messages.slice(-30);
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var time = new Date(m.time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
        if (m.system) {
            html += '<div class="chat-msg system">' + m.text + ' <span class="time">' + time + '</span></div>';
        } else {
            html += '<div class="chat-msg"><span class="name">' + m.from + ':</span> ' + m.text + ' <span class="time">' + time + '</span></div>';
        }
    }
    container.innerHTML = html || '<p style="color:var(--text2);">Нет сообщений</p>';
    container.scrollTop = container.scrollHeight;
}

function toggleChat() {
    var panel = document.getElementById('chat-panel');
    if (panel) panel.classList.toggle('mobile-open');
}

// ============================================
// УВЕДОМЛЕНИЯ (ПОЧТА)
// ============================================
function updateMailBadge() {
    var badge = document.getElementById('mail-badge');
    if (!badge) return;
    var unread = 0;
    for (var i = 0; i < gameData.notifications.length; i++) {
        if (!gameData.notifications[i].read) unread++;
    }
    badge.style.display = unread > 0 ? 'inline' : 'none';
    badge.textContent = unread;
}

function renderMail() {
    var html = '<h2>📬 Почта</h2>';
    if (gameData.notifications.length === 0) {
        html += '<p style="color:var(--text2);">Нет уведомлений.</p>';
    } else {
        for (var i = 0; i < gameData.notifications.length; i++) {
            var n = gameData.notifications[i];
            var dateStr = new Date(n.time || n.createdAt).toLocaleString('ru');
            html += '<div class="notification' + (n.read ? '' : ' unread') + '" onclick="markNotifRead(' + i + ')">';
            html += '<strong>' + dateStr + '</strong><br>' + n.message;
            if (n.type === 'application' && myMode === 'promoter') {
                html += '<br><button class="btn btn-green btn-small" style="margin-top:5px;" onclick="acceptApplication(\'' + n.fighterId + '\',' + n.amount + ',' + i + ')">Принять заявку</button>';
            }
            html += '</div>';
        }
    }
    return html;
}

function markNotifRead(index) {
    if (gameData.notifications[index]) {
        gameData.notifications[index].read = true;
    }
    updateMailBadge();
    showTab('mail');
}

function acceptApplication(fighterId, amount, notifIndex) {
    var p = findMyPromotion();
    var f = null;
    for (var i = 0; i < gameData.fighters.length; i++) {
        if (gameData.fighters[i].id === fighterId) {
            f = gameData.fighters[i];
            break;
        }
    }
    if (!p || !f) { alert('Ошибка!'); return; }
    if (p.budget < amount) { alert('Недостаточно средств в бюджете!'); return; }

    p.budget -= amount;
    p.expenses = (p.expenses || 0) + amount;
    if (!p.roster) p.roster = [];
    p.roster.push(f.id);
    f.currentPromotionId = p.id;
    f.coins = (f.coins || 0) + amount;

    if (gameData.notifications[notifIndex]) {
        gameData.notifications[notifIndex].read = true;
    }

    if (socket) {
        socket.emit('updateFighter', f);
        socket.emit('updatePromotion', p);
    }

    updateMailBadge();
    showTab('mail');
    alert(f.fullName + ' принят в ростер за 🪙' + amount + '!');
}
