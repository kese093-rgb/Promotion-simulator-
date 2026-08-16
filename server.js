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

// Загрузка данных
let DB = { fighters: [], promotions: [], events: [], onlineCount: 0 };

try {
    if (fs.existsSync(DATA_FILE)) {
        DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!DB.events) DB.events = [];
        console.log('✅ Данные загружены. Бойцов:', DB.fighters.length);
    }
} catch(e) {
    console.log('📦 Создана новая база данных');
}

function saveDB() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2));
}

app.use(express.static(path.join(__dirname)));

const online = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Новое подключение:', socket.id);

    // Отправляем полное состояние
    socket.emit('serverState', {
        fighters: DB.fighters,
        promotions: DB.promotions,
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

    // Инициализация промоушнов (от первого клиента)
    socket.on('initPromotions', (promotions) => {
        if (DB.promotions.length === 0) {
            DB.promotions = promotions;
            saveDB();
            io.emit('promotionsInitialized', DB.promotions);
            console.log('🏆 Инициализированы промоушны');
        }
    });

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
        console.log('👊 Создан боец:', fighter.fullName);
    });

    // Подписание бойца
    socket.on('signFighter', (data) => {
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        const fighter = DB.fighters.find(f => f.id === data.fighterId);
        
        if (promo && fighter) {
            if (!promo.roster) promo.roster = [];
            if (!promo.roster.includes(fighter.id)) {
                promo.roster.push(fighter.id);
            }
            fighter.currentPromotionId = promo.id;
            saveDB();
            
            io.emit('fighterUpdated', fighter);
            io.emit('promotionUpdated', promo);
            console.log('📝 Подписан боец:', fighter.fullName, '→', promo.name);
        }
    });

    // Обновление бойца
    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) {
            const old = DB.fighters[idx];
            if (!data.currentPromotionId && old.currentPromotionId) {
                data.currentPromotionId = old.currentPromotionId;
            }
            DB.fighters[idx] = { ...old, ...data };
            saveDB();
            io.emit('fighterUpdated', DB.fighters[idx]);
            console.log('🔄 Обновлён боец:', DB.fighters[idx].fullName);
        }
    });

    // Обновление промоушна
    socket.on('updatePromotion', (data) => {
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) {
            DB.promotions[idx] = { ...DB.promotions[idx], ...data };
            saveDB();
            io.emit('promotionUpdated', DB.promotions[idx]);
            console.log('🔄 Обновлён промоушн:', DB.promotions[idx].name);
        }
    });

    // Удаление бойца
    socket.on('deleteFighter', (data) => {
        DB.fighters = DB.fighters.filter(f => f.ownerId !== data.playerId);
        saveDB();
        console.log('🗑 Удалены бойцы игрока');
    });

    // Отключение
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

server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Открой: http://localhost:${PORT}`);
});
