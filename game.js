// ============================================
// PROMOTION SIMULATOR - ОСНОВНОЙ ФАЙЛ
// ============================================

// Хранилище данных
const GameState = {
    mode: null, // 'career' или 'promotion'
    player: null,
    promotions: [],
    fighters: [],
    currentDate: new Date('2024-01-01'),
    events: [],
    saveSlots: {}
};

// Инициализация
function init() {
    loadAllSaves();
    generateStartingFighters();
    generateStartingPromotions();
    updateLoadSection();
    showScreen('main-menu');
}

// ============================================
// НАВИГАЦИЯ
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function goToMainMenu() {
    GameState.mode = null;
    GameState.player = null;
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
        currentDate: GameState.currentDate,
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
    
    if (Object.keys(GameState.saveSlots).length > 0) {
        loadSection.style.display = 'block';
        savesList.innerHTML = Object.entries(GameState.saveSlots).map(([key, save]) => {
            const modeName = save.mode === 'career' ? 'Карьера бойца' : 'Промоутер';
            const date = new Date(save.timestamp).toLocaleString('ru');
            return `
                <div class="slot-card" style="margin:10px 0; padding:15px; cursor:pointer;"
                     onclick="loadGame('${save.mode}') && startGame()">
                    <p><strong>${modeName}</strong></p>
                    <p style="color:#8892B0;">Сохранено: ${date}</p>
                </div>
            `;
        }).join('');
    }
}

// ============================================
// ГЕНЕРАЦИЯ БОЙЦОВ
// ============================================
const FIRST_NAMES = ['Алексей', 'Дмитрий', 'Иван', 'Максим', 'Артём', 'Маркус', 'Джеймс', 'Рашид', 'Карлос', 'Такуми'];
const LAST_NAMES = ['Волков', 'Соколов', 'Орлов', 'Медведев', 'Козлов', 'Johnson', 'Silva', 'Nakamura', 'Rodriguez', 'Smith'];
const NATIONS = ['Россия', 'США', 'Бразилия', 'Франция', 'Япония', 'Великобритания', 'Нидерланды', 'Австралия'];

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
        // Характеристики
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
        // Статистика по видам спорта
        records: {
            MMA: { wins: 0, losses: 0, draws: 0, ko: 0, submissions: 0, title: null, rank: 0 },
            BOXING: { wins: 0, losses: 0, draws: 0, ko: 0, title: null, rank: 0 },
            WRESTLING: { wins: 0, losses: 0, draws: 0, title: null, rank: 0 }
        },
        // Травмы
        injuries: [],
        // Контракты
        contracts: [],
        // Внешность
        skinTone: '#F5D6C3',
        hairColor: '#1A1A1A',
        // Статус
        retired: false,
        retirementAge: randomInt(35, 45)
    };
}

function generateStartingFighters() {
    if (GameState.fighters.length > 0) return;
    
    for (let i = 0; i < 50; i++) {
        GameState.fighters.push(generateFighter());
    }
}

// ============================================
// ГЕНЕРАЦИЯ ПРОМОУШНОВ
// ============================================
function generateStartingPromotions() {
    if (GameState.promotions.length > 0) return;
    
    const promoData = [
        { name: 'Ultimate Fight Association', country: 'Россия', budget: 5000000 },
        { name: 'Apex Fighting Championship', country: 'США', budget: 8000000 },
        { name: 'Rising Sun Combat League', country: 'Япония', budget: 3000000 },
        { name: 'Euro Fight Night', country: 'Франция', budget: 2000000 }
    ];
    
    promoData.forEach(data => {
        const promo = {
            id: generateId(),
            name: data.name,
            country: data.country,
            budget: data.budget,
            revenue: 0,
            expenses: 0,
            popularity: randomInt(30, 70),
            foundedDate: GameState.currentDate,
            roster: [],
            staff: [],
            events: [],
            colors: { primary: '#E31E24', secondary: '#1A1A1A' }
        };
        
        // Добавляем бойцов в ростер
        const fightersToAdd = randomInt(10, 20);
        const availableFighters = [...GameState.fighters];
        for (let i = 0; i < fightersToAdd && availableFighters.length > 0; i++) {
            const idx = randomInt(0, availableFighters.length - 1);
            const fighter = availableFighters.splice(idx, 1)[0];
            
            const contract = {
                fighterId: fighter.id,
                promotionId: promo.id,
                salary: randomInt(10000, 100000),
                winBonus: randomInt(5000, 50000),
                titleBonus: randomInt(10000, 100000),
                duration: randomInt(12, 36),
                fightsLeft: randomInt(3, 10),
                signed: GameState.currentDate
            };
            
            fighter.contracts.push(contract);
            promo.roster.push(fighter.id);
        }
        
        GameState.promotions.push(promo);
    });
}

// ============================================
// СОЗДАНИЕ ИГРОКА
// ============================================
function startCareer() {
    showScreen('fighter-creator');
}

function createFighter() {
    const fighter = {
        id: generateId(),
        firstName: document.getElementById('fighter-firstname').value || 'Боец',
        lastName: document.getElementById('fighter-lastname').value || 'Новый',
        fullName: `${document.getElementById('fighter-firstname').value || 'Боец'} ${document.getElementById('fighter-lastname').value || 'Новый'}`,
        age: parseInt(document.getElementById('fighter-age').value),
        height: parseInt(document.getElementById('fighter-height').value),
        weight: parseInt(document.getElementById('fighter-weight').value),
        nationality: document.getElementById('fighter-nationality').value,
        skinTone: document.getElementById('fighter-skintone').value,
        hairColor: document.getElementById('fighter-haircolor').value,
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
    const promo = {
        id: generateId(),
        name: document.getElementById('promo-name').value || 'New Promotion',
        country: document.getElementById('promo-country').value,
        budget: parseInt(document.getElementById('promo-budget').value),
        revenue: 0,
        expenses: 0,
        popularity: 30,
        foundedDate: new Date(GameState.currentDate),
        roster: [],
        staff: [],
        events: [],
        colors: {
            primary: document.getElementById('promo-color1').value,
            secondary: document.getElementById('promo-color2').value
        }
    };
    
    GameState.promotions.push(promo);
    GameState.player = promo;
    GameState.mode = 'promotion';
    
    saveGame();
    showScreen('promotion-dashboard');
    renderPromotionDashboard();
}

// ============================================
// КАРЬЕРА БОЙЦА
// ============================================
function renderCareerDashboard() {
    const fighter = GameState.player;
    if (!fighter) return;
    
    // Мини-карточка
    document.getElementById('fighter-card-mini').innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:48px;">👤</div>
            <h3>${fighter.fullName}</h3>
            <p style="color:#8892B0;">${fighter.nationality} | ${fighter.age} лет</p>
            <p style="color:#8892B0;">${fighter.height} см | ${fighter.weight} кг</p>
        </div>
    `;
    
    showCareerTab('overview');
}

function showCareerTab(tab) {
    document.querySelectorAll('#career-dashboard .nav-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('career-content');
    const fighter = GameState.player;
    
    switch(tab) {
        case 'overview':
            content.innerHTML = renderCareerOverview(fighter);
            break;
        case 'training':
            content.innerHTML = renderTraining(fighter);
            break;
        case 'fights':
            content.innerHTML = renderFightHistory(fighter);
            break;
        case 'contracts':
            content.innerHTML = renderContracts(fighter);
            break;
        case 'rankings':
            content.innerHTML = renderRankings(fighter);
            break;
    }
}

function renderCareerOverview(fighter) {
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
                <div class="stat-bar"><div class="stat-bar-fill bar-stamina" style="width:${fighter.stamina}%"></div></div>
            </div>
            <div class="stat-card">
                <h3>Сила</h3>
                <div class="stat-value">${fighter.strength}</div>
                <div class="stat-bar"><div class="stat-bar-fill bar-strength" style="width:${fighter.strength}%"></div></div>
            </div>
            <div class="stat-card">
                <h3>Скорость</h3>
                <div class="stat-value">${fighter.speed}</div>
                <div class="stat-bar"><div class="stat-bar-fill bar-speed" style="width:${fighter.speed}%"></div></div>
            </div>
            <div class="stat-card">
                <h3>Ударка</h3>
                <div class="stat-value">${fighter.striking}</div>
                <div class="stat-bar"><div class="stat-bar-fill" style="width:${fighter.striking}%;background:#EF4444;"></div></div>
            </div
