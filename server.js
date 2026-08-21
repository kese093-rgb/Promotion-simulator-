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
    DB.promotions = [
        { id: 'ufc', name: 'UFC', sport: 'MMA', country: 'США', popularity: 90, roster: [] },
        { id: 'wbc', name: 'WBC', sport: 'BOXING', country: 'Мексика', popularity: 85, roster: [] },
        { id: 'raf', name: 'RAF', sport: 'WRESTLING', country: 'Россия', popularity: 70, roster: [] },
        { id: 'iba', name: 'IBA', sport: 'BAREKNUCKLE', country: 'США', popularity: 60, roster: [] }
    ];
    saveDB();
}

app.use(express.static(path.join(__dirname)));

const online = new Map();

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

    // Обновление промоушна
    socket.on('updatePromotion', (data) => {
        if (data.deleted) {
            DB.promotions = DB.promotions.filter(p => p.id !== data.id);
            saveDB();
            console.log('🗑 Удалён промоушн:', data.id);
            return;
        }
        
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) {
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

    // Подписание бойца (устаревший метод, используем updateFighter)
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

// Автосохранение каждые 30 секунд
setInterval(() => {
    saveDB();
}, 30000);

server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 Открой: http://localhost:${PORT}`);
});
