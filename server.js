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

let DB = { fighters: [], promotions: [], events: [], onlineCount: 0 };

try {
    if (fs.existsSync(DATA_FILE)) {
        DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        if (!DB.events) DB.events = [];
        console.log('✅ Данные загружены. Бойцов:', DB.fighters.length);
    }
} catch(e) {
    console.log('📦 Новая база');
}

function saveDB() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 2));
}

app.use(express.static(path.join(__dirname)));

const online = new Map();

io.on('connection', (socket) => {
    socket.emit('serverState', {
        fighters: DB.fighters,
        promotions: DB.promotions,
        events: DB.events,
        onlineCount: online.size
    });

    socket.on('register', (name) => {
        online.set(socket.id, name);
        DB.onlineCount = online.size;
        io.emit('playerJoined', { name: name, onlineCount: online.size });
        socket.emit('registered', { id: socket.id });
    });

    socket.on('createFighter', (data) => {
        const fighter = { ...data, ownerId: socket.id, isBot: false };
        DB.fighters.push(fighter);
        saveDB();
        io.emit('fighterCreated', fighter);
    });

    socket.on('createPromotion', (data) => {
        const promo = { ...data, ownerId: socket.id, isAI: false };
        DB.promotions.push(promo);
        saveDB();
        io.emit('promotionCreated', promo);
    });

    socket.on('signFighter', (data) => {
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        const fighter = DB.fighters.find(f => f.id === data.fighterId);
        if (promo && fighter) {
            if (!promo.roster) promo.roster = [];
            if (promo.roster.indexOf(fighter.id) === -1) {
                promo.roster.push(fighter.id);
            }
            fighter.currentPromotionId = promo.id;
            saveDB();
            io.emit('fighterUpdated', fighter);
            io.emit('promotionUpdated', promo);
        }
    });

    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) {
            const oldPromoId = DB.fighters[idx].currentPromotionId;
            DB.fighters[idx] = { ...DB.fighters[idx], ...data };
            if (!DB.fighters[idx].currentPromotionId && oldPromoId) {
                DB.fighters[idx].currentPromotionId = oldPromoId;
            }
            saveDB();
            io.emit('fighterUpdated', DB.fighters[idx]);
        }
    });

    socket.on('updatePromotion', (data) => {
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) {
            const oldRoster = DB.promotions[idx].roster;
            const oldEvents = DB.promotions[idx].events;
            DB.promotions[idx] = { ...DB.promotions[idx], ...data };
            if (!DB.promotions[idx].roster && oldRoster) DB.promotions[idx].roster = oldRoster;
            if (!DB.promotions[idx].events && oldEvents) DB.promotions[idx].events = oldEvents;
            saveDB();
            io.emit('promotionUpdated', DB.promotions[idx]);
        }
    });

    socket.on('deleteFighter', (data) => {
        DB.fighters = DB.fighters.filter(f => f.ownerId !== data.playerId);
        saveDB();
    });

    socket.on('deletePromotion', (data) => {
        DB.promotions = DB.promotions.filter(p => p.ownerId !== data.playerId);
        saveDB();
    });

    socket.on('disconnect', () => {
        const name = online.get(socket.id);
        online.delete(socket.id);
        DB.onlineCount = online.size;
        io.emit('playerLeft', { name: name, onlineCount: online.size });
    });
});

server.listen(PORT, () => console.log('🚀 Сервер запущен на порту ' + PORT));
