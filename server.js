const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

// Общая база данных
let DB = {
    fighters: [],
    promotions: [],
    onlineCount: 0
};

// Начальные боты
for (let i = 0; i < 10; i++) {
    DB.fighters.push({
        id: 'bot_' + i,
        fullName: ['Хабиб Нурмагомедов','Ислам Махачев','Конор Макгрегор','Джон Джонс','Алекс Волкановски'][i%5],
        country: 'Россия',
        baseStyle: 'boxing',
        isBot: true,
        currentPromotionId: null
    });
}
DB.promotions.push({ id: 'promo_ai', name: 'Global Fight League', sport: 'MMA', country: 'США', popularity: 60, roster: [], isAI: true });

app.use(express.static(path.join(__dirname)));

const online = new Map();

io.on('connection', (socket) => {
    // Отправляем текущее состояние
    socket.emit('serverState', {
        fighters: DB.fighters,
        promotions: DB.promotions,
        onlineCount: online.size
    });

    socket.on('register', (name) => {
        online.set(socket.id, name);
        DB.onlineCount = online.size;
        io.emit('playerJoined', { name: name, onlineCount: online.size });
        socket.emit('registered', { id: socket.id });
    });

    socket.on('createFighter', (data) => {
        const f = { ...data, ownerId: socket.id, isBot: false };
        DB.fighters.push(f);
        io.emit('fighterCreated', f);
    });

    socket.on('createPromotion', (data) => {
        const p = { ...data, ownerId: socket.id, isAI: false };
        DB.promotions.push(p);
        io.emit('promotionCreated', p);
    });

    socket.on('signFighter', (data) => {
        const promo = DB.promotions.find(p => p.id === data.promotionId);
        const fighter = DB.fighters.find(f => f.id === data.fighterId);
        if (promo && fighter) {
            if (!promo.roster) promo.roster = [];
            promo.roster.push(fighter.id);
            fighter.currentPromotionId = promo.id;
            io.emit('fighterUpdated', fighter);
            io.emit('promotionUpdated', promo);
        }
    });

    socket.on('disconnect', () => {
        const name = online.get(socket.id);
        online.delete(socket.id);
        DB.onlineCount = online.size;
        io.emit('playerLeft', { name: name, onlineCount: online.size });
    });
});

server.listen(PORT, () => console.log('🚀 Порт ' + PORT));
