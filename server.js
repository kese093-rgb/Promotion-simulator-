const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

let DB = { fighters: [], promotions: [], events: [], messages: [] };

const n1 = ['Хабиб','Ислам','Конор','Джон','Алекс','Макс','Дастин','Тони','Хорхе','Камару'];
const n2 = ['Нурмагомедов','Махачев','Макгрегор','Джонс','Волкановски','Холлоуэй','Порье','Фергюсон','Масвидаль','Усман'];
for (let i = 0; i < 20; i++) {
    DB.fighters.push({
        id: 'bot_' + i, firstName: n1[i%10], lastName: n2[i%10], fullName: n1[i%10] + ' ' + n2[i%10],
        age: 20+Math.floor(Math.random()*15), country: 'Россия', baseStyle: 'boxing',
        boxing: 40+Math.floor(Math.random()*40), wrestling: 40+Math.floor(Math.random()*40),
        submission: 40+Math.floor(Math.random()*40), kick: 40+Math.floor(Math.random()*40),
        speed: 40+Math.floor(Math.random()*40), stamina: 40+Math.floor(Math.random()*40), strength: 40+Math.floor(Math.random()*40),
        energy: 100, maxEnergy: 100, prime: Math.floor(Math.random()*50), maxPrime: 100,
        hype: Math.floor(Math.random()*60), maxHype: 100, coins: 0,
        records: { wins: Math.floor(Math.random()*15), losses: Math.floor(Math.random()*5), ko: 0 },
        currentPromotionId: null, retired: false, isBot: true, ownerId: null, tactic: 'balance', nickname: ''
    });
}
DB.promotions = [
    { id: 'promo_1', name: 'Global Fight League', sport: 'MMA', country: 'США', budget: 5000, popularity: 60, roster: [], events: [], isAI: true, ownerId: null },
    { id: 'promo_2', name: 'Euro Combat', sport: 'MMA', country: 'Франция', budget: 4000, popularity: 50, roster: [], events: [], isAI: true, ownerId: null },
    { id: 'promo_3', name: 'Asian Warriors', sport: 'MMA', country: 'Япония', budget: 3500, popularity: 45, roster: [], events: [], isAI: true, ownerId: null }
];

app.use(express.static(path.join(__dirname)));
const online = new Map();

io.on('connection', (socket) => {
    console.log('🔌 Подключился:', socket.id);
    
    socket.emit('serverState', {
        fighters: DB.fighters, promotions: DB.promotions,
        events: DB.events, messages: DB.messages.slice(-50),
        notifications: [], onlineCount: online.size
    });

    socket.on('register', (data) => {
        online.set(socket.id, { name: data.name });
        console.log('✅ Зарегистрирован:', data.name, '| Онлайн:', online.size);
        io.emit('playerJoined', { name: data.name, onlineCount: online.size, message: '👋 ' + data.name + ' зашёл!' });
        socket.emit('registered', { id: socket.id });
    });

    socket.on('chatMessage', (data) => {
        console.log('💬 Чат:', data.name, ':', data.text);
        const msg = { id: Date.now(), from: data.name, text: data.text, time: new Date().toISOString() };
        DB.messages.push(msg); if (DB.messages.length > 200) DB.messages.shift();
        io.emit('newMessage', msg);
    });

    socket.on('createFighter', (data) => {
        const f = {
            id: 'f_' + Date.now(), firstName: data.firstName, lastName: data.lastName,
            fullName: data.firstName + ' ' + data.lastName,
            age: data.age, country: data.country, baseStyle: data.baseStyle,
            boxing: data.boxing, wrestling: data.wrestling, submission: data.submission,
            kick: data.kick, speed: data.speed, stamina: data.stamina, strength: data.strength,
            energy: 100, maxEnergy: 100, prime: 0, maxPrime: 100, hype: 0, maxHype: 100, coins: 0,
            records: { wins: 0, losses: 0, draws: 0, ko: 0 },
            currentPromotionId: null, retired: false, isBot: false, ownerId: socket.id, tactic: 'balance', nickname: ''
        };
        DB.fighters.push(f);
        console.log('👤 Создан боец:', f.fullName);
        io.emit('fighterCreated', f);
    });

    socket.on('createPromotion', (data) => {
        const p = {
            id: 'promo_' + Date.now(), name: data.name, sport: data.sport, country: data.country,
            budget: 2000, revenue: 0, expenses: 0, popularity: 30,
            roster: [], events: [], isAI: false, ownerId: socket.id
        };
        DB.promotions.push(p);
        console.log('🏢 Создан промоушн:', p.name);
        io.emit('promotionCreated', p);
    });

    socket.on('applyToPromotion', (data) => {
        const fighter = DB.fighters.find(f => f.id === data.fighterId);
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        console.log('📨 Заявка от', fighter ? fighter.fullName : '?', 'в', promo ? promo.name : '?');
        if (!fighter || !promo || !promo.ownerId) return;
        const notif = {
            id: 'n_' + Date.now(), type: 'application',
            playerId: promo.ownerId, fighterId: data.fighterId, promotionId: data.promotionId,
            amount: data.amount, message: 'Боец ' + fighter.fullName + ' хочет вступить за 🪙' + data.amount,
            read: false, time: new Date().toISOString()
        };
        for (let [sid, p] of online) { if (sid === promo.ownerId) io.to(sid).emit('notification', notif); }
    });

    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) DB.fighters[idx] = { ...DB.fighters[idx], ...data };
    });

    socket.on('updatePromotion', (data) => {
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) DB.promotions[idx] = { ...DB.promotions[idx], ...data };
    });

    socket.on('createEvent', (data) => {
        const evt = { id: 'evt_' + Date.now(), name: data.name, promotionId: data.promotionId, date: data.date, fights: [] };
        DB.events.push(evt);
        console.log('📅 Создан кард:', evt.name);
        socket.emit('serverState', { fighters: DB.fighters, promotions: DB.promotions, events: DB.events, messages: DB.messages.slice(-50), notifications: [], onlineCount: online.size });
    });

    socket.on('updateEvent', (data) => {
        const idx = DB.events.findIndex(e => e.id === data.id);
        if (idx !== -1) DB.events[idx] = { ...DB.events[idx], ...data };
    });

    socket.on('disconnect', () => {
        const p = online.get(socket.id);
        console.log('🔌 Отключился:', p ? p.name : socket.id);
        if (p) io.emit('playerLeft', { name: p.name, onlineCount: online.size - 1, message: '👋 ' + p.name + ' вышел' });
        online.delete(socket.id);
    });
});

server.listen(PORT, () => console.log('🚀 Порт ' + PORT + ' | Бойцов: ' + DB.fighters.length));

// Логирование каждые 30 секунд
setInterval(() => {
    console.log('❤️ Жив. Онлайн:', online.size, '| Бойцов:', DB.fighters.length, '| Чат:', DB.messages.length);
}, 30000);
