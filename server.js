const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ============================================================
// 1. БАЗА ДАННЫХ
// ============================================================
let DB = { 
    fighters: [], 
    promotions: [], 
    events: [], 
    onlineCount: 0 
};

function loadDB() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            DB = JSON.parse(data);
            if (!DB.events) DB.events = [];
            if (!DB.promotions) DB.promotions = [];
            if (!DB.fighters) DB.fighters = [];
            console.log('✅ Данные загружены. Бойцов:', DB.fighters.length);
            console.log('✅ Промоушнов:', DB.promotions.length);
            return true;
        }
    } catch(e) {
        console.log('❌ Ошибка загрузки:', e.message);
    }
    return false;
}

function saveDB() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2));
        console.log('💾 Данные сохранены. Бойцов:', DB.fighters.length);
        return true;
    } catch(e) {
        console.log('❌ Ошибка сохранения:', e.message);
        return false;
    }
}

// Загружаем данные при старте
if (!loadDB()) {
    console.log('📦 Создана новая база данных');
    saveDB();
}

app.use(express.static(path.join(__dirname)));

// ============================================================
// 2. ОНЛАЙН ИГРОКИ
// ============================================================
const online = new Map();

// ============================================================
// 3. SOCKET.IO
// ============================================================
io.on('connection', (socket) => {
    console.log('🔌 Новое подключение:', socket.id);

    // Отправляем полное состояние
    socket.emit('serverState', {
        fighters: DB.fighters || [],
        promotions: DB.promotions || [],
        events: DB.events || [],
        onlineCount: online.size
    });

    // Регистрация
    socket.on('register', (name) => {
        online.set(socket.id, name || 'Игрок');
        DB.onlineCount = online.size;
        io.emit('playerJoined', { 
            name: name || 'Игрок', 
            onlineCount: online.size 
        });
        socket.emit('registered', { id: socket.id });
        console.log('👤 Зарегистрирован:', name || 'Игрок');
    });

    // ============================================================
    // БОЙЦЫ
    // ============================================================
    
    // Создание бойца
    socket.on('createFighter', (data) => {
        const fighter = { 
            ...data, 
            ownerId: socket.id, 
            isBot: false,
            createdAt: new Date().toISOString()
        };
        DB.fighters.push(fighter);
        saveDB();
        io.emit('fighterCreated', fighter);
        console.log('👊 Создан боец:', fighter.fullName, 'ID:', fighter.id);
    });

    // Обновление бойца
    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) {
            DB.fighters[idx] = { ...DB.fighters[idx], ...data };
            saveDB();
            io.emit('fighterUpdated', DB.fighters[idx]);
            console.log('🔄 Обновлён боец:', DB.fighters[idx].fullName);
        } else {
            console.log('❌ Боец не найден для обновления:', data.id);
        }
    });

    // Удаление бойца
    socket.on('deleteFighter', (data) => {
        const playerId = data.playerId;
        DB.fighters = DB.fighters.filter(f => f.ownerId !== playerId);
        saveDB();
        console.log('🗑 Удалены бойцы игрока:', playerId);
        
        // Обновляем всех клиентов
        io.emit('serverState', {
            fighters: DB.fighters,
            promotions: DB.promotions,
            events: DB.events || [],
            onlineCount: online.size
        });
    });

    // ============================================================
    // ПРОМОУШНЫ
    // ============================================================
    
    // Обновление промоушна (создание/редактирование)
    socket.on('updatePromotion', (data) => {
        if (data.deleted) {
            DB.promotions = DB.promotions.filter(p => p.id !== data.id);
            saveDB();
            console.log('🗑 Удалён промоушн:', data.id);
            io.emit('promotionUpdated', { id: data.id, deleted: true });
            return;
        }
        
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) {
            // Обновление существующего
            DB.promotions[idx] = { ...DB.promotions[idx], ...data };
            saveDB();
            io.emit('promotionUpdated', DB.promotions[idx]);
            console.log('🔄 Обновлён промоушн:', DB.promotions[idx].name);
        } else {
            // Новый промоушн
            DB.promotions.push(data);
            saveDB();
            io.emit('promotionUpdated', data);
            console.log('🏆 Создан промоушн:', data.name);
        }
    });

    // ============================================================
    // БОИ
    // ============================================================
    
    // Назначение боя
    socket.on('fightScheduled', (data) => {
        io.emit('fightScheduled', data);
        console.log('⚔️ Бой назначен в промоушне:', data.promotionId);
    });

    // Начало боя
    socket.on('fightStarted', (data) => {
        io.emit('fightStarted', data);
        console.log('⚔️ Бой начался:', data.id);
    });

    // Обновление боя (комментарии)
    socket.on('fightUpdate', (data) => {
        io.emit('fightUpdate', data);
    });

    // Завершение боя
    socket.on('fightFinished', (data) => {
        io.emit('fightFinished', data);
        console.log('🏆 Бой завершён:', data.id);
    });

    // ============================================================
    // ОТКЛЮЧЕНИЕ
    // ============================================================
    
    socket.on('disconnect', () => {
        const name = online.get(socket.id);
        online.delete(socket.id);
        DB.onlineCount = online.size;
        io.emit('playerLeft', { 
            name: name || 'Игрок', 
            onlineCount: online.size 
        });
        console.log('🔌 Отключился:', name || socket.id);
    });
});

// ============================================================
// 4. АВТОСОХРАНЕНИЕ
// ============================================================
setInterval(() => {
    saveDB();
}, 30000);

// ============================================================
// 5. ЗАПУСК СЕРВЕРА
// ============================================================
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Открой: http://localhost:${PORT}`);
    console.log(`📁 Файл данных: ${DATA_FILE}`);
});
