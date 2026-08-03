// ============================================
// PROMOTION SIMULATOR - ИСПРАВЛЕННАЯ ВЕРСИЯ
// ============================================

// Хранилище данных
const GameState = {
    mode: null,
    player: null,
    promotions: [],
    fighters: [],
    currentDate: new Date('2024-01-01'),
    events: [],
    saveSlots: {}
};

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// НАВИГАЦИЯ
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
}

function goToMainMenu() {
    GameState.mode = null;
    GameState.player = null;
    showScreen('main-menu');
    updateLoadSection();
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
function init() {
    loadAllSaves();
    generateStartingFighters();
    generateStartingPromotions();
    updateLoadSection();
    showScreen('main-menu');
}

// ============================================
// СОХРАНЕНИЯ
// ============================================
function saveGame() {
    const key = `promotion_sim_${GameState.mode}`;
    const saveData = {
        mode: GameState.mode,
        player: GameState.player,
        promotions: GameState.promotions,
        fighters: GameState.fighters,
        currentDate: GameState.currentDate.toISOString(),
        events: GameState.events,
        timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(saveData));
    GameState.saveSlots[key] = saveData;
    updateLoadSection();
}

function loadGame(mode) {
    const key = `promotion_sim_${mode}`;
    const data = localStorage.getItem(key);
    if (data) {
        const saveData = JSON.parse(data);
        GameState.mode = saveData.mode;
        GameState.player = saveData.player;
        GameState.promotions = saveData.promotions || [];
        GameState.fighters = saveData.fighters || [];
        GameState.currentDate = new Date(saveData.currentDate);
        GameState.events = saveData.events || [];
        return true;
    }
    return false;
}

function loadAllSaves() {
    ['career', 'promotion'].forEach(mode => {
        const key = `promotion_sim_${mode}`;
        const data = localStorage.getItem(key);
        if (data) {
            GameState.saveSlots[key] = JSON.parse(data);
        }
    });
}

function updateLoadSection() {
    const loadSection = document.getElementById('load-section');
    const savesList = document.getElementById('saves-list');
    
    if (!loadSection || !savesList) return;
    
    const saves = Object.entries(GameState.saveSlots);
    if (saves.length > 0) {
        loadSection.style.display = 'block';
        savesList.innerHTML = saves.map(([key, save]) => {
            const modeName = save.mode === 'career' ? 'Карьера бойца' : 'Промоутер';
            const date = new Date(save.timestamp).toLocaleString('ru');
            const playerName = save.player ? (save.player.fullName || save.player.name || 'Неизвестно') : 'Неизвестно';
            return `
                <div class="slot-card" style="margin:10px 0; padding:15px; cursor:pointer; text-align:left;"
                     onclick="loadAndStartGame('${save.mode}')">
                    <p><strong>${modeName}</strong> - ${playerName}</p>
                    <p style="color:#8892B0; font-size:14px;">Сохранено: ${date}</p>
                </div>
            `;
        }).join('');
    } else {
        loadSection.style.display = 'none';
    }
}

function loadAndStartGame(mode) {
    if (loadGame(mode)) {
        if (mode === 'career') {
            showScreen('career-dashboard');
            renderCareerDashboard();
        } else {
            showScreen('promotion-dashboard');
            renderPromotionDashboard();
        }
    }
}

// ============================================
// ДАННЫЕ ДЛЯ ГЕНЕРАЦИИ
// ============================================
const FIRST_NAMES = ['Алексей', 'Дмитрий', 'Иван', 'Максим', 'Артём', 'Александр', 'Михаил', 'Сергей', 'Андрей', 'Николай', 'Маркус', 'Джеймс', 'Рашид', 'Карлос', 'Такуми'];
const LAST_NAMES = ['Волков', 'Соколов', 'Орлов', 'Медведев', 'Козлов', 'Петров', 'Иванов', 'Смирнов', 'Попов', 'Новиков', 'Johnson', 'Silva', 'Nakamura', 'Rodriguez', 'Smith'];
const NATIONS = ['Россия', 'США', 'Бразилия', 'Франция', 'Япония', 'Великобритания', 'Нидерланды', 'Австралия'];

// ============================================
// ГЕНЕРАЦИЯ БОЙЦОВ
// ============================================
function generateFighter(name = null) {
    const firstName = name || FIRST_NAMES[randomInt(0, FIRST_NAMES.length - 1)];
    const lastName = LAST_NAMES[randomInt(0, LAST_NAMES.length - 1)];
    
    return {
        id: generateId(),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        age: randomInt(18, 35),
        height: randomInt(160, 210),
        weight: randomInt(55, 120),
        nationality: NATIONS[randomInt(0, NATIONS.length - 1)],
        health: 100,
        energy: 100,
        stamina: randomInt(40, 90),
        strength: randomInt(40, 90),
        speed: randomInt(40, 90),
        striking: randomInt(40, 90),
        wrestling: randomInt(40, 90),
        grappling: randomInt(40, 90),
        defense: randomInt(40, 90),
        iq: randomInt(40, 90),
        experience: randomInt(0, 50),
        morale: randomInt(50, 100),
        popularity: randomInt(10, 80),
        discipline: randomInt(40, 90),
        records: {
            MMA: { wins: 0, losses: 0, draws: 0, ko: 0, submissions: 0, title: null, rank: 0 },
            BOXING: { wins: 0, losses: 0, draws: 0, ko: 0, title: null, rank: 0 },
            WRESTLING: { wins: 0, losses: 0, draws: 0, title: null, rank: 0 }
        },
        injuries: [],
        contracts: [],
        skinTone: '#F5D6C3',
        hairColor: '#1A1A1A',
        retired: false,
        retirementAge: randomInt(35, 45)
    };
}

function generateStartingFighters() {
    if (GameState.fighters && GameState.fighters.length > 0) return;
    GameState.fighters = [];
    for (let i = 0; i < 50; i++) {
        GameState.fighters.push(generateFighter());
    }
}

// ============================================
// ГЕНЕРАЦИЯ ПРОМОУШНОВ
// ============================================
function generateStartingPromotions() {
    if (GameState.promotions && GameState.promotions.length > 0) return;
    
    const promoData = [
        { name: 'Ultimate Fight Association', country: 'Россия', budget: 5000000 },
        { name: 'Apex Fighting Championship', country: 'США', budget: 8000000 },
        { name: 'Rising Sun Combat League', country: 'Япония', budget: 3000000 },
        { name: 'Euro Fight Night', country: 'Франция', budget: 2000000 }
    ];
    
    GameState.promotions = [];
    
    promoData.forEach(data => {
        const promo = {
            id: generateId(),
            name: data.name,
            country: data.country,
            budget: data.budget,
            revenue: 0,
            expenses: 0,
            popularity: randomInt(30, 70),
            foundedDate: new Date(GameState.currentDate),
            roster: [],
            staff: [],
            events: [],
            colors: { primary: '#E31E24', secondary: '#1A1A1A' }
        };
        
        const fightersToAdd = randomInt(10, 20);
        const availableFighters = [...GameState.fighters];
        for (let i = 0; i < fightersToAdd && availableFighters.length > 0; i++) {
            const idx = randomInt(0, availableFighters.length - 1);
            const fighter = availableFighters[idx];
            availableFighters.splice(idx, 1);
            
            const contract = {
                fighterId: fighter.id,
                promotionId: promo.id,
                salary: randomInt(10000, 100000),
                winBonus: randomInt(5000, 50000),
                titleBonus: randomInt(10000, 100000),
                duration: randomInt(12, 36),
                fightsLeft: randomInt(3, 10),
                signed: new Date(GameState.currentDate)
            };
            
            fighter.contracts.push(contract);
            promo.roster.push(fighter.id);
        }
        
        GameState.promotions.push(promo);
    });
}

// ============================================
// СОЗДАНИЕ БОЙЦА ИГРОКОМ
// ============================================
function startCareer() {
    showScreen('fighter-creator');
}

function createFighter() {
    const firstName = document.getElementById('fighter-firstname')?.value || 'Боец';
    const lastName = document.getElementById('fighter-lastname')?.value || 'Новый';
    const age = parseInt(document.getElementById('fighter-age')?.value) || 20;
    const height = parseInt(document.getElementById('fighter-height')?.value) || 180;
    const weight = parseInt(document.getElementById('fighter-weight')?.value) || 75;
    const nationality = document.getElementById('fighter-nationality')?.value || 'Россия';
    const skinTone = document.getElementById('fighter-skintone')?.value || '#F5D6C3';
    const hairColor = document.getElementById('fighter-haircolor')?.value || '#1A1A1A';
    
    const fighter = {
        id: generateId(),
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        age,
        height,
        weight,
        nationality,
        skinTone,
        hairColor,
        health: 100,
        energy: 100,
        stamina: 50 + randomInt(0, 20),
        strength: 50 + randomInt(0, 20),
        speed: 50 + randomInt(0, 20),
        striking: 50 + randomInt(0, 20),
        wrestling: 50 + randomInt(0, 20),
        grappling: 50 + randomInt(0, 20),
        defense: 50 + randomInt(0, 20),
        iq: 50 + randomInt(0, 20),
        experience: 0,
        morale: 80,
        popularity: 20,
        discipline: 50 + randomInt(0, 20),
        records: {
            MMA: { wins: 0, losses: 0, draws: 0, ko: 0, submissions: 0, title: null, rank: 0 },
            BOXING: { wins: 0, losses: 0, draws: 0, ko: 0, title: null, rank: 0 },
            WRESTLING: { wins: 0, losses: 0, draws: 0, title: null, rank: 0 }
        },
        injuries: [],
        contracts: [],
        retired: false,
        retirementAge: randomInt(35, 45)
    };
    
    if (!GameState.fighters) GameState.fighters = [];
    GameState.fighters.push(fighter);
    GameState.player = fighter;
    GameState.mode = 'career';
    
    saveGame();
    showScreen('career-dashboard');
    renderCareerDashboard();
}

// ============================================
// СОЗДАНИЕ ПРОМОУШНА
// ============================================
function startPromoter() {
    showScreen('promotion-creator');
}

function createPromotion() {
    const name = document.getElementById('promo-name')?.value || 'New Promotion';
    const country = document.getElementById('promo-country')?.value || 'Россия';
    const budget = parseInt(document.getElementById('promo-budget')?.value) || 1000000;
    const color1 = document.getElementById('promo-color1')?.value || '#E31E24';
    const color2 = document.getElementById('promo-color2')?.value || '#1A1A1A';
    
    const promo = {
        id: generateId(),
        name,
        country,
        budget,
        revenue: 0,
        expenses: 0,
        popularity: 30,
        foundedDate: new Date(GameState.currentDate),
        roster: [],
        staff: [],
        events: [],
        colors: {
            primary: color1,
            secondary: color2
        }
    };
    
    if (!GameState.promotions) GameState.promotions = [];
    GameState.promotions.push(promo);
    GameState.player = promo;
    GameState.mode = 'promotion';
    
    saveGame();
    showScreen('promotion-dashboard');
    renderPromotionDashboard();
}

// ============================================
// ОТРИСОВКА ДАШБОРДОВ
// ============================================
function renderCareerDashboard() {
    const fighter = GameState.player;
    if (!fighter) return goToMainMenu();
    
    const card = document.getElementById('fighter-card-mini');
    if (card) {
        card.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:48px;">👤</div>
                <h3>${fighter.fullName}</h3>
                <p style="color:#8892B0;">${fighter.nationality} | ${fighter.age} лет</p>
                <p style="color:#8892B0;">${fighter.height} см | ${fighter.weight} кг</p>
            </div>
        `;
    }
    
    showCareerTabContent('overview');
}

function showCareerTab(tab) {
    document.querySelectorAll('#career-dashboard .nav-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    showCareerTabContent(tab);
}

function showCareerTabContent(tab) {
    const content = document.getElementById('career-content');
    if (!content) return;
    
    const fighter = GameState.player;
    if (!fighter) return;
    
    switch(tab) {
        case 'overview':
            content.innerHTML = renderOverview(fighter);
            break;
        case 'training':
            content.innerHTML = renderTrainingTab(fighter);
            break;
        case 'fights':
            content.innerHTML = renderFightsTab(fighter);
            break;
        case 'contracts':
            content.innerHTML = renderContractsTab(fighter);
            break;
        case 'rankings':
            content.innerHTML = renderRankingsTab(fighter);
            break;
    }
}

function renderOverview(fighter) {
    return `
        <h2>📊 Обзор карьеры</h2>
        
        <div class="stat-grid">
            <div class="stat-card">
                <h3>❤️ Здоровье</h3>
                <div class="stat-value">${fighter.health}%</div>
                <div class="stat-bar"><div class="stat-bar-fill bar-health" style="width:${fighter.health}%"></div></div>
            </div>
            <div class="stat-card">
                <h3>⚡ Энергия</h3>
                <div class="stat-value">${fighter.energy}%</div>
                <div class="stat-bar"><div class="stat-bar-fill bar-energy" style="width:${fighter.energy}%"></div></div>
            </div>
            <div class="stat-card">
                <h3>😊 Мораль</h3>
                <div class="stat-value">${fighter.morale}%</div>
                <div class="stat-bar"><div class="stat-bar-fill bar-morale" style="width:${fighter.morale}%"></div></div>
            </div>
        </div>
        
        <h3 style="margin-top:30px;">📈 Характеристики</h3>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Выносливость</h3>
                <div class="stat-value">${fighter.stamina}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.stamina}%;background:#8B5CF6;"></div></div>
            </div>
            <div class="stat-card">
                <h3>Сила</h3>
                <div class="stat-value">${fighter.strength}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.strength}%;background:#EF4444;"></div></div>
            </div>
            <div class="stat-card">
                <h3>Скорость</h3>
                <div class="stat-value">${fighter.speed}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.speed}%;background:#06B6D4;"></div></div>
            </div>
            <div class="stat-card">
                <h3>Ударная техника</h3>
                <div class="stat-value">${fighter.striking}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.striking}%;background:#F59E0B;"></div></div>
            </div>
            <div class="stat-card">
                <h3>Борьба</h3>
                <div class="stat-value">${fighter.wrestling}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.wrestling}%;background:#10B981;"></div></div>
            </div>
            <div class="stat-card">
                <h3>Защита</h3>
                <div class="stat-value">${fighter.defense}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.defense}%;background:#6366F1;"></div></div>
            </div>
        </div>
        
        <h3 style="margin-top:30px;">🏆 Рекорды</h3>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>MMA</h3>
                <div class="stat-value" style="font-size:24px;">${fighter.records.MMA.wins}-${fighter.records.MMA.losses}-${fighter.records.MMA.draws}</div>
                <p style="color:#8892B0;">KO: ${fighter.records.MMA.ko} | Приёмы: ${fighter.records.MMA.submissions}</p>
            </div>
            <div class="stat-card">
                <h3>Бокс</h3>
                <div class="stat-value" style="font-size:24px;">${fighter.records.BOXING.wins}-${fighter.records.BOXING.losses}-${fighter.records.BOXING.draws}</div>
                <p style="color:#8892B0;">KO: ${fighter.records.BOXING.ko}</p>
            </div>
            <div class="stat-card">
                <h3>Борьба</h3>
                <div class="stat-value" style="font-size:24px;">${fighter.records.WRESTLING.wins}-${fighter.records.WRESTLING.losses}-${fighter.records.WRESTLING.draws}</div>
            </div>
        </div>
        
        ${fighter.injuries && fighter.injuries.length > 0 ? `
            <h3 style="margin-top:30px;color:#EF4444;">🤕 Травмы</h3>
            <div class="stat-grid">
                ${fighter.injuries.map(injury => `
                    <div class="stat-card" style="border-color:#EF4444;">
                        <h3>${injury.name}</h3>
                        <p style="color:#8892B0;">Восстановление: ${injury.recoveryTime} недель</p>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <button class="btn btn-primary btn-large" onclick="simulateFight()" style="margin-top:30px;">
            🥊 Провести бой (симуляция)
        </button>
    `;
}

function simulateFight() {
    const fighter = GameState.player;
    if (!fighter) return;
    
    const opponent = GameState.fighters.find(f => f.id !== fighter.id && !f.retired);
    if (!opponent) {
        alert('Нет доступных соперников!');
        return;
    }
    
    // Простая симуляция
    const fighterScore = fighter.striking + fighter.wrestling + fighter.defense + fighter.speed;
    const opponentScore = opponent.striking + opponent.wrestling + opponent.defense + opponent.speed;
    const total = fighterScore + opponentScore;
    const winChance = fighterScore / total;
    
    const roll = Math.random();
    const won = roll < winChance;
    
    // Обновление энергии и здоровья
    fighter.energy = Math.max(0, fighter.energy - randomInt(15, 40));
    fighter.health = Math.max(0, fighter.health - randomInt(5, 20));
    fighter.experience += randomInt(1, 5);
    fighter.popularity += won ? randomInt(1, 10) : randomInt(-5, 2);
    fighter.morale += won ? randomInt(5, 15) : randomInt(-15, -5);
    
    if (won) {
        fighter.records.MMA.wins++;
        if (Math.random() < 0.3) fighter.records.MMA.ko++;
        if (Math.random() < 0.2) fighter.records.MMA.submissions++;
    } else {
        fighter.records.MMA.losses++;
    }
    
    saveGame();
    renderCareerDashboard();
    
    alert(`${won ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ...'} 
${fighter.fullName} ${won ? 'победил' : 'проиграл'} ${opponent.fullName}!
Энергия: ${fighter.energy}
Здоровье: ${fighter.health}`);
}

function renderTrainingTab(fighter) {
    return `
        <h2>🏋️ Тренировки</h2>
        <p style="color:#8892B0;margin-bottom:20px;">Тренируйтесь для улучшения характеристик</p>
        
        <div class="stat-grid">
            <div class="stat-card" onclick="trainAttribute('stamina')" style="cursor:pointer;">
                <h3>Кардио 🏃</h3>
                <p>Выносливость: ${fighter.stamina}</p>
                <button class="btn btn-primary">Тренировать</button>
            </div>
            <div class="stat-card" onclick="trainAttribute('strength')" style="cursor:pointer;">
                <h3>Силовая 💪</h3>
                <p>Сила: ${fighter.strength}</p>
                <button class="btn btn-primary">Тренировать</button>
            </div>
            <div class="stat-card" onclick="trainAttribute('speed')" style="cursor:pointer;">
                <h3>Скорость ⚡</h3>
                <p>Скорость: ${fighter.speed}</p>
                <button class="btn btn-primary">Тренировать</button>
            </div>
            <div class="stat-card" onclick="trainAttribute('striking')" style="cursor:pointer;">
                <h3>Ударка 🥊</h3>
                <p>Ударная техника: ${fighter.striking}</p>
                <button class="btn btn-primary">Тренировать</button>
            </div>
            <div class="stat-card" onclick="trainAttribute('wrestling')" style="cursor:pointer;">
                <h3>Борьба 🤼</h3>
                <p>Борьба: ${fighter.wrestling}</p>
                <button class="btn btn-primary">Тренировать</button>
            </div>
            <div class="stat-card" onclick="trainAttribute('defense')" style="cursor:pointer;">
                <h3>Защита 🛡️</h3>
                <p>Защита: ${fighter.defense}</p>
                <button class="btn btn-primary">Тренировать</button>
            </div>
        </div>
    `;
}

function trainAttribute(attr) {
    const fighter = GameState.player;
    if (!fighter) return;
    
    if (fighter.energy < 20) {
        alert('Недостаточно энергии для тренировки! Отдохните.');
        return;
    }
    
    const gain = randomInt(1, 3);
    fighter[attr] = Math.min(100, fighter[attr] + gain);
    fighter.energy = Math.max(0, fighter.energy - 15);
    
    saveGame();
    renderCareerDashboard();
    alert(`${attr.toUpperCase()} улучшен на ${gain}! Текущее значение: ${fighter[attr]}`);
}

function renderFightsTab(fighter) {
    return `
        <h2>🥊 История боёв</h2>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>Всего боёв</h3>
                <div class="stat-value">${fighter.records.MMA.wins + fighter.records.MMA.losses + fighter.records.MMA.draws}</div>
            </div>
            <div class="stat-card">
                <h3>Побед</h3>
                <div class="stat-value" style="color:#10B981;">${fighter.records.MMA.wins}</div>
            </div>
            <div class="stat-card">
                <h3>Поражений</h3>
                <div class="stat-value" style="color:#EF4444;">${fighter.records.MMA.losses}</div>
            </div>
        </div>
    `;
}

function renderContractsTab(fighter) {
    const contracts = fighter.contracts || [];
    return `
        <h2>📋 Контракты</h2>
        ${contracts.length === 0 ? 
            '<p style="color:#8892B0;">Нет активных контрактов</p>' :
            contracts.map(c => `
                <div class="stat-card" style="margin-bottom:15px;">
                    <h3>${c.promotionId}</h3>
                    <p>💰 Зарплата: $${c.salary.toLocaleString()}</p>
                    <p>🎯 Бонус за победу: $${c.winBonus.toLocaleString()}</p>
                    <p>📅 Боёв осталось: ${c.fightsLeft}</p>
                </div>
            `).join('')
        }
    `;
}

function renderRankingsTab(fighter) {
    return `
        <h2>🏆 Рейтинги</h2>
        <div class="stat-grid">
            <div class="stat-card">
                <h3>MMA Рейтинг</h3>
                <div class="stat-value">#${fighter.records.MMA.rank || 'Н/Д'}</div>
            </div>
            <div class="stat-card">
                <h3>Бокс Рейтинг</h3>
                <div class="stat-value">#${fighter.records.BOXING.rank || 'Н/Д'}</div>
            </div>
            <div class="stat-card">
                <h3>Борьба Рейтинг</h3>
                <div class="stat-value">#${fighter.records.WRESTLING.rank || 'Н/Д'}</div>
            </div>
        </div>
    `;
}

// ============================================
// ПРОМОУТЕР ДАШБОРД
// ============================================
function renderPromotionDashboard() {
    const promo = GameState.player;
    if (!promo) return goToMainMenu();
    
    const card = document.getElementById('promo-card-mini');
    if (card) {
        card.innerHTML = `
            <div style="text-align:center;">
                <div style="font-size:48px;">🏢</div>
                <h3>${promo.name}</h3>
                <p style="color:#8892B0;">${promo.country}</p>
                <p style="color:#10B981;">💰 $${(promo.budget || 0).toLocaleString()}</p>
            </div>
        `;
    }
    
    showPromoterTabContent('overview');
}

function showPromoterTab(tab) {
    document.querySelectorAll('#promotion-dashboard .nav-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    showPromoterTabContent(tab);
}

function showPromoterTabContent(tab) {
    const content = document.getElementById('promotion-content');
    if (!content) return;
    
    const promo = GameState.player;
    if (!promo) return;
    
    switch(tab) {
        case 'overview':
            content.innerHTML = `
                <h2>📊 Обзор промоушна</h2>
                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>💰 Бюджет</h3>
                        <div class="stat-value" style="color:#10B981;">$${promo.budget.toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>⭐ Популярность</h3>
                        <div class="stat-value">${promo.popularity}%</div>
                        <div class="stat-bar"><div class="stat-bar-fill bar-morale" style="width:${promo.popularity}%"></div></div>
                    </div>
                    <div class="stat-card">
                        <h3>👥 Бойцы</h3>
                        <div class="stat-value">${promo.roster.length}</div>
                    </div>
                </div>
            `;
            break;
        case 'roster':
            const fighters = GameState.fighters.filter(f => promo.roster.includes(f.id));
            content.innerHTML = `
                <h2>👥 Список бойцов (${fighters.length})</h2>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Боец</th>
                            <th>Возраст</th>
                            <th>Вес</th>
                            <th>Рекорд MMA</th>
                            <th>Популярность</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fighters.map(f => `
                            <tr>
                                <td><strong>${f.fullName}</strong></td>
                                <td>${f.age}</td>
                                <td>${f.weight} кг</td>
                                <td>${f.records.MMA.wins}-${f.records.MMA.losses}</td>
                                <td>${f.popularity}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
        case 'events':
            content.innerHTML = `
                <h2>📅 Ивенты</h2>
                <button class="btn btn-primary" onclick="createEvent()">Создать новый ивент</button>
            `;
            break;
        case 'finances':
            content.innerHTML = `
                <h2>💰 Финансы</h2>
                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Бюджет</h3>
                        <div class="stat-value">$${promo.budget.toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Доходы</h3>
                        <div class="stat-value" style="color:#10B981;">$${promo.revenue.toLocaleString()}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Расходы</h3>
                        <div class="stat-value" style="color:#EF4444;">$${promo.expenses.toLocaleString()}</div>
                    </div>
                </div>
            `;
            break;
        case 'rankings':
            content.innerHTML = `
                <h2>🏆 Рейтинги промоушнов</h2>
                <table class="data-table">
                    <thead><tr><th>#</th><th>Название</th><th>Популярность</th><th>Бойцы</th></tr></thead>
                    <tbody>
                        ${GameState.promotions.sort((a,b) => b.popularity - a.popularity).map((p, i) => `
                            <tr>
                                <td>${i+1}</td>
                                <td><strong>${p.name}</strong></td>
                                <td>${p.popularity}%</td>
                                <td>${p.roster.length}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            break;
    }
}

function createEvent() {
    const promo = GameState.player;
    if (!promo) return;
    
    const eventName = prompt('Название ивента:', `${promo.name} Fight Night`);
    if (!eventName) return;
    
    const newEvent = {
        id: generateId(),
        name: eventName,
        promotionId: promo.id,
        date: new Date(GameState.currentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        fights: [],
        venue: 'TBD',
        ticketSales: 0,
        revenue: 0
    };
    
    if (!GameState.events) GameState.events = [];
    GameState.events.push(newEvent);
    promo.events.push(newEvent.id);
    
    saveGame();
    renderPromotionDashboard();
    alert(`Ивент "${eventName}" создан!`);
}

// ============================================
// ЗАПУСК
// ============================================
window.onload = function() {
    init();
    console.log('Promotion Simulator запущен!');
    console.log('Бойцов:', GameState.fighters.length);
    console.log('Промоушнов:', GameState.promotions.length);
};
