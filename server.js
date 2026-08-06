const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const PORT = process.env.PORT || 3000;

let DB = {
    fighters: [],
    promotions: [],
    onlineCount: 0
};

app.use(express.static(path.join(__dirname)));

const online = new Map();

io.on('connection', (socket) => {
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
        const fighter = { ...data, ownerId: socket.id, isBot: false };
        DB.fighters.push(fighter);
        io.emit('fighterCreated', fighter);
    });

    socket.on('createPromotion', (data) => {
        const promo = { ...data, ownerId: socket.id, isAI: false };
        DB.promotions.push(promo);
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
            io.emit('fighterUpdated', fighter);
            io.emit('promotionUpdated', promo);
        }
    });

    socket.on('updateFighter', (data) => {
        const idx = DB.fighters.findIndex(f => f.id === data.id);
        if (idx !== -1) {
            DB.fighters[idx] = { ...DB.fighters[idx], ...data };
            io.emit('fighterUpdated', DB.fighters[idx]);
        }
    });

    socket.on('updatePromotion', (data) => {
        const idx = DB.promotions.findIndex(p => p.id === data.id);
        if (idx !== -1) {
            DB.promotions[idx] = { ...DB.promotions[idx], ...data };
            io.emit('promotionUpdated', DB.promotions[idx]);
        }
    });

    socket.on('deleteFighter', (data) => {
        DB.fighters = DB.fighters.filter(f => f.ownerId !== data.playerId);
    });

    socket.on('deletePromotion', (data) => {
        DB.promotions = DB.promotions.filter(p => p.ownerId !== data.playerId);
    });

    socket.on('disconnect', () => {
        const name = online.get(socket.id);
        online.delete(socket.id);
        DB.onlineCount = online.size;
        io.emit('playerLeft', { name: name, onlineCount: online.size });
    });
});

server.listen(PORT, () => console.log('🚀 Сервер запущен на порту ' + PORT));
