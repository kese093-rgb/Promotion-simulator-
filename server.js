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

// База данных
let DB = {
    fighters: [],
    promotions: [],
    players: {},
    messages: [],
    notifications: [],
    events: [],
    serverTime: new Date().toISOString()
};

// Загрузка с диска
try {
    if (fs.existsSync(DATA_FILE)) {
        DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        console.log('✅ Данные загружены. Бойцов:', DB.fighters.length);
    }
} catch(e) {
    console.log('📦 Новая база данных');
}

// Сохранение
function saveDB() {
    DB.serverTime = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2));
}

// Генерация начальных бойцов
if (DB.fighters.length === 0) {
    const n1 = ['Хабиб','Ислам','Конор','Джон','Алекс','Макс','Дастин','Тони','Хорхе','Камару'];
    const n2 = ['Нурмагомедов','Махачев','Макгрегор','Джонс','Волкановски','Холлоуэй','Порье','Фергюсон','Масвидаль','Усман'];
    const countries = ['Россия','Дагестан','США','Бразилия','Франция','Япония'];
    const styles = ['boxing','wrestling','kickboxing'];

    for (let i = 0; i < 30; i++) {
        DB.fighters.push({
            id: 'bot_' + i,
            firstName: n1[i % n1.length],
            lastName: n2[i % n2.length],
            fullName: n1[i % n1.length] + ' ' + n2[i % n2.length],
            age: 20 + Math.floor(Math.random() * 15),
            country: countries[Math.floor(Math.random() * countries.length)],
            baseStyle: styles[Math.floor(Math.random() * 3)],
            boxing: 30 + Math.floor(Math.random() * 50),
            wrestling: 30 + Math.floor(Math.random() * 50),
            submission: 30 + Math.floor(Math.random() * 50),
            kick: 30 + Math.floor(Math.random() * 50),
            speed: 30 + Math.floor(Math.random() * 50),
            stamina: 30 + Math.floor(Math.random() * 50),
            strength: 30 + Math.floor(Math.random() * 50),
            energy: 100, maxEnergy: 100,
            prime: Math.floor(Math.random() * 50), maxPrime: 100,
            hype: Math.floor(Math.random() * 60), maxHype: 100,
            coins: Math.floor(Math.random() * 500),
            nickname: '',
            records: { wins: Math.floor(Math.random() * 15), losses: Math.floor(Math.random() * 5), draws: 0, ko: Math.floor(Math.random() * 8) },
            currentPromotionId: null, retired: false, isBot: true, ownerId: null, tactic: 'balance'
        });
    }

    DB.promotions.push(
        { id: 'promo_1', name: 'Global Fight League', sport: 'MMA', country: 'США', budget: 5000, revenue: 0, expenses: 0, popularity: 60, roster: [], events: [], isAI: true, ownerId: null },
        { id: 'promo_2', name: 'Euro Combat Championship', sport: 'MMA', country: 'Франция', budget: 4000, revenue: 0, expenses: 0, popularity: 50, roster: [], events: [], isAI: true, ownerId: null },
        { id: 'promo_3', name: 'Asian Warriors FC', sport: 'MMA', country: 'Япония', budget: 3500, revenue: 0, expenses: 0, popularity: 45, roster: [], events: [], isAI: true, ownerId: null }
    );

    saveDB();
}

// Раздача статики (index.html, style.css, js/*)
app.use(express.static(path.join(__dirname)));

// Для файлов в папке js/
app.use('/js', express.static(path.join(__dirname, 'js')));

const onlinePlayers = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Подключился:', socket.id);

    // Отправляем текущее состояние
    socket.emit('serverState', {
        fighters: DB.fighters,
        promotions: DB.promotions,
        messages: DB.messages.slice(-50),
        notifications: DB.notifications.filter(n => n.playerId === socket.id).slice(-20),
        events: DB.events,
        onlineCount: onlinePlayers.size
    });

    // Регистрация
    socket.on('register', (data) => {
        const player = { id: socket.id, name: data.name || 'Игрок', joinedAt: new Date().toISOString() };
        onlinePlayers.set(socket.id, player);
        if (!DB.players[socket.id]) DB.players[socket.id] = player;
        saveDB();
        io.emit('playerJoined', { name: player.name, onlineCount: onlinePlayers.size, message: '👋 ' + player.name + ' зашёл в игру!' });
        socket.emit('registered', { id: socket.id });
        console.log('✅ Зарегистрирован:', player.name, '(онлайн:', onlinePlayers.size, ')');
    });

    // Чат
    socket.on('chatMessage', (data) => {
        const msg = { id: Date.now(), from: data.name || 'Аноним', text: data.text || '', time: new Date().toISOString() };
        DB.messages.push(msg);
        if (DB.messages.length > 200) DB.messages.shift();
        saveDB();
        io.emit('newMessage', msg);
    });

    // Создание бойца
    socket.on('createFighter', (data) => {
        const fighter = {
            id: 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            firstName: data.firstName, lastName: data.lastName,
            fullName: data.firstName + ' ' + data.lastName,
            age: data.age || 20, country: data.country || 'Россия', baseStyle: data.baseStyle || 'boxing',
            boxing: data.boxing || 50, wrestling: data.wrestling || 50, submission: data.submission || 50,
            kick: data.kick || 50, speed: data.speed || 50, stamina: data.stamina || 50, strength: data.strength || 50,
            energy: 100, maxEnergy: 100, prime: 0, maxPrime: 100, hype: 0, maxHype: 100, coins: 0,
            records: { wins: 0, losses: 0, draws: 0, ko: 0 },
            currentPromotionId: null, retired: false, isBot: false,
            ownerId: socket.id, tactic: 'balance', nickname: ''
        };
        DB.fighters.push(fighter);
        saveDB();
        io.emit('fighterCreated', fighter);
        io.emit('newMessage', { id: Date.now(), from: 'Система', text: '🥊 Новый боец: ' + fighter.fullName + ' из ' + fighter.country + '!', time: new Date().toISOString(), system: true });
        console.log('👤 Создан боец:', fighter.fullName);
    });

    // Создание промоушна
    socket.on('createPromotion', (data) => {
        const promo = {
            id: 'promo_' + Date.now(),
            name: data.name, sport: data.sport, country: data.country,
            budget: data.budget || 2000, revenue: 0, expenses: 0, popularity: data.popularity || 30,
            roster: [], events: [], isAI: false, ownerId: socket.id
        };
        DB.promotions.push(promo);
        saveDB();
        io.emit('promotionCreated', promo);
        console.log('🏢 Создан промоушн:', promo.name);
    });

    // Заявка в промоушн
    socket.on('applyToPromotion', (data) => {
        const fighter = DB.fighters.find(f => f.id === data.fighterId);
        const notif = {
            id: 'n_' + Date.now(),
            type: 'application',
            playerId: socket.id,
            fighterId: data.fighterId,
            promotionId: data.promotionId,
            amount: data.amount,
            message: 'Боец ' + (fighter ? fighter.fullName : 'Неизвестный') + ' хочет вступить в ваш промоушн за 🪙' + data.amount,
            read: false,
            time: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        DB.notifications.push(notif);
        saveDB();

        // Отправляем уведомление владельцу промоушна
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        if (promo && promo.ownerId) {
            for (let [sid, player] of onlinePlayers) {
                if (sid === promo.ownerId) {
                    io.to(sid).emit('notification', notif);
                    break;
                }
            }
        }
    });

    // Обновление бойца
    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) {
            DB.fighters[idx] = { ...DB.fighters[idx], ...data };
            saveDB();
        }
    });

    // Обновление промоушна
    socket.on('updatePromotion', (data) => {
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) {
            DB.promotions[idx] = { ...DB.promotions[idx], ...data };
            saveDB();
        }
    });

    // Создание ивента
    socket.on('createEvent', (data) => {
        const event = {
            id: 'evt_' + Date.now(),
            name: data.name,
            promotionId: data.promotionId,
            date: data.date,
            fights: data.fights || []
        };
        DB.events.push(event);
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        if (promo) {
            if (!promo.events) promo.events = [];
            promo.events.push(event.id);
        }
        saveDB();
        socket.emit('serverState', {
            fighters: DB.fighters,
            promotions: DB.promotions,
            events: DB.events,
            messages: DB.messages.slice(-50),
            notifications: DB.notifications.filter(n => n.playerId === socket.id).slice(-20),
            onlineCount: onlinePlayers.size
        });
    });

    // Обновление ивента
    socket.on('updateEvent', (data) => {
        const idx = DB.events.findIndex(e => e.id === data.id);
        if (idx !== -1) {
            DB.events[idx] = { ...DB.events[idx], ...data };
            saveDB();
        }
    });

    // Удаление бойца
    socket.on('deleteFighter', (data) => {
        DB.fighters = DB.fighters.filter(f => f.ownerId !== data.playerId);
        saveDB();
    });

    // Отключение
    socket.on('disconnect', () => {
        const player = onlinePlayers.get(socket.id);
        if (player) {
            io.emit('playerLeft', { name: player.name, onlineCount: onlinePlayers.size - 1, message: '👋 ' + player.name + ' вышел из игры' });
        }
        onlinePlayers.delete(socket.id);
        console.log('🔌 Отключился:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log('🚀 Сервер запущен на порту ' + PORT);
    console.log('👥 Бойцов:', DB.fighters.length, '| 🏢 Промоушнов:', DB.promotions.length);
});
