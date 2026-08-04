const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;
const BIN_ID = '6a71cc78da38895dfeb7ff33';
const MASTER_KEY = '$2a$10$7/eseBzE5QUXkIfz4lF52ehC18o1lY2dVbu8CwV/02czD2ECJAKpy';
const BIN_URL = 'https://api.jsonbin.io/v3/b/' + BIN_ID;

let DB = { fighters: [], promotions: [], events: [], messages: [] };

async function loadDB() {
    try {
        const res = await fetch(BIN_URL, { headers: { 'X-Master-Key': MASTER_KEY } });
        if (res.ok) { const data = await res.json(); DB = data.record; console.log('✅ Загружено:', DB.fighters.length, 'бойцов'); }
    } catch(e) { console.log('📦 Новая база'); }
    if (!DB.fighters || DB.fighters.length === 0) {
        DB.fighters = [];
        const n1 = ['Хабиб','Ислам','Конор','Джон','Алекс','Макс','Дастин','Тони','Хорхе','Камару'];
        const n2 = ['Нурмагомедов','Махачев','Макгрегор','Джонс','Волкановски','Холлоуэй','Порье','Фергюсон','Масвидаль','Усман'];
        for (let i = 0; i < 20; i++) {
            DB.fighters.push({
                id: 'bot_' + i, firstName: n1[i%10], lastName: n2[i%10], fullName: n1[i%10] + ' ' + n2[i%10],
                age: 20 + Math.floor(Math.random()*15), country: 'Россия', baseStyle: 'boxing',
                boxing: 40+Math.floor(Math.random()*40), wrestling: 40+Math.floor(Math.random()*40),
                submission: 40+Math.floor(Math.random()*40), kick: 40+Math.floor(Math.random()*40),
                speed: 40+Math.floor(Math.random()*40), stamina: 40+Math.floor(Math.random()*40),
                strength: 40+Math.floor(Math.random()*40),
                energy: 100, maxEnergy: 100, prime: Math.floor(Math.random()*50), maxPrime: 100,
                hype: Math.floor(Math.random()*60), maxHype: 100, coins: 0,
                records: { wins: Math.floor(Math.random()*15), losses: Math.floor(Math.random()*5), ko: 0 },
                currentPromotionId: null, retired: false, isBot: true, ownerId: null, tactic: 'balance', nickname: ''
            });
        }
    }
    if (!DB.promotions || DB.promotions.length === 0) {
        DB.promotions = [
            { id: 'promo_1', name: 'Global Fight League', sport: 'MMA', country: 'США', budget: 5000, popularity: 60, roster: [], events: [], isAI: true, ownerId: null },
            { id: 'promo_2', name: 'Euro Combat', sport: 'MMA', country: 'Франция', budget: 4000, popularity: 50, roster: [], events: [], isAI: true, ownerId: null },
            { id: 'promo_3', name: 'Asian Warriors', sport: 'MMA', country: 'Япония', budget: 3500, popularity: 45, roster: [], events: [], isAI: true, ownerId: null }
        ];
    }
    if (!DB.events) DB.events = [];
    if (!DB.messages) DB.messages = [];
}

async function saveDB() {
    try {
        await fetch(BIN_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
            body: JSON.stringify(DB)
        });
    } catch(e) { console.log('Ошибка сохранения'); }
}

app.use(express.static(path.join(__dirname)));

const online = new Map();

io.on('connection', (socket) => {
    socket.emit('serverState', {
        fighters: DB.fighters || [], promotions: DB.promotions || [],
        events: DB.events || [], messages: (DB.messages || []).slice(-50),
        notifications: [], onlineCount: online.size
    });

    socket.on('register', (data) => {
        online.set(socket.id, { name: data.name });
        io.emit('playerJoined', { name: data.name, onlineCount: online.size, message: '👋 ' + data.name + ' зашёл!' });
        socket.emit('registered', { id: socket.id });
    });

    socket.on('chatMessage', (data) => {
        const msg = { id: Date.now(), from: data.name, text: data.text, time: new Date().toISOString() };
        if (!DB.messages) DB.messages = [];
        DB.messages.push(msg);
        if (DB.messages.length > 200) DB.messages.shift();
        saveDB();
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
        if (!DB.fighters) DB.fighters = [];
        DB.fighters.push(f);
        saveDB();
        io.emit('fighterCreated', f);
    });

    socket.on('createPromotion', (data) => {
        const p = {
            id: 'promo_' + Date.now(), name: data.name, sport: data.sport, country: data.country,
            budget: 2000, revenue: 0, expenses: 0, popularity: 30,
            roster: [], events: [], isAI: false, ownerId: socket.id
        };
        if (!DB.promotions) DB.promotions = [];
        DB.promotions.push(p);
        saveDB();
        io.emit('promotionCreated', p);
    });

    socket.on('applyToPromotion', (data) => {
        const fighter = DB.fighters.find(f => f.id === data.fighterId);
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        if (!fighter || !promo || !promo.ownerId) return;
        const notif = {
            id: 'n_' + Date.now(), type: 'application',
            playerId: promo.ownerId, fighterId: data.fighterId, promotionId: data.promotionId,
            amount: data.amount, message: 'Боец ' + fighter.fullName + ' хочет вступить за 🪙' + data.amount,
            read: false, time: new Date().toISOString()
        };
        for (let [sid, p] of online) {
            if (sid === promo.ownerId) io.to(sid).emit('notification', notif);
        }
    });

    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) { DB.fighters[idx] = { ...DB.fighters[idx], ...data }; saveDB(); }
    });

    socket.on('updatePromotion', (data) => {
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) { DB.promotions[idx] = { ...DB.promotions[idx], ...data }; saveDB(); }
    });

    socket.on('createEvent', (data) => {
        const evt = { id: 'evt_' + Date.now(), name: data.name, promotionId: data.promotionId, date: data.date, fights: [] };
        if (!DB.events) DB.events = [];
        DB.events.push(evt);
        saveDB();
        socket.emit('serverState', { fighters: DB.fighters, promotions: DB.promotions, events: DB.events, messages: DB.messages.slice(-50), notifications: [], onlineCount: online.size });
    });

    socket.on('updateEvent', (data) => {
        const idx = DB.events.findIndex(e => e.id === data.id);
        if (idx !== -1) { DB.events[idx] = { ...DB.events[idx], ...data }; saveDB(); }
    });

    socket.on('deleteFighter', (data) => {
        DB.fighters = DB.fighters.filter(f => f.ownerId !== data.playerId);
        saveDB();
    });

    socket.on('disconnect', () => {
        const p = online.get(socket.id);
        if (p) io.emit('playerLeft', { name: p.name, onlineCount: online.size - 1, message: '👋 ' + p.name + ' вышел' });
        online.delete(socket.id);
    });
});

loadDB().then(() => {
    server.listen(PORT, () => console.log('🚀 Порт ' + PORT + ' | Бойцов: ' + DB.fighters.length));
});
