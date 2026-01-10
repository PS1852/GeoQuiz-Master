
import { GoogleGenAI, Type } from "@google/genai";
import { COUNTRIES } from "./data.js";

// --- STATE MANAGEMENT ---
const BADGES = [
    { id: 'first_steps', icon: 'footprints', title: 'First Steps', desc: 'Complete your first game.' },
    { id: 'sharpshooter', icon: 'crosshair', title: 'Sharpshooter', desc: 'Achieve 100% accuracy in a game.' },
    { id: 'speed_demon', icon: 'zap', title: 'Speed Demon', desc: 'Score 15+ in Blitz Mode.' },
    { id: 'cartographer', icon: 'map', title: 'Cartographer', desc: 'Score a perfect pinpoint (<50km) in Map Mode.' },
    { id: 'news_junkie', icon: 'newspaper', title: 'News Junkie', desc: 'Check Global Pulse 3 days in a row.' },
    { id: 'big_spender', icon: 'shopping-bag', title: 'Big Spender', desc: 'Buy an item from the shop.' }
];

const SHOP_ITEMS = [
    { id: 'streak_freeze', icon: 'snowflake', name: 'Streak Freeze', cost: 500, desc: 'Protect your streak for one day.' },
    { id: 'theme_matrix', icon: 'monitor', name: 'Matrix Theme', cost: 1000, desc: 'Unlock a green hacker aesthetic.' },
    { id: 'hint_pack', icon: 'lightbulb', name: '5 Hints', cost: 200, desc: 'Get 5 clues for Detective mode.' }
];

const LEVEL_CAP = 50;

const TRANSLATIONS = {
    en: {
        welcome: "Welcome Back",
        login_btn: "Start Adventure",
        guest: "Play as Guest",
        stats: "Stats",
        global_pulse: "Global Pulse",
        shop: "XP Shop",
        badges: "Badges",
        mode_blitz: "Blitz Mode",
        desc_blitz: "60 seconds. Infinite scoring. Addictive.",
        mode_daily: "Daily Challenge",
        desc_daily: "New questions every day.",
        mode_flag: "Flags",
        desc_flag: "Identify the flag.",
        mode_map: "Map",
        desc_map: "Pinpoint locations.",
        mode_detective: "Detective",
        desc_detective: "Solve AI clues.",
        mode_shapes: "Shapes",
        desc_shapes: "Guess by borders.",
        q_flag: "Identify the flag.",
        q_map: "Locate {country} on the map.",
        click_map: "Click on the map to place your pin.",
        distance: "Distance",
        level: "Level",
        xp: "XP",
        streak: "Streak",
        correct: "Correct!",
        wrong: "Wrong!",
        game_over: "Game Over",
        you_scored: "You Scored",
        locked: "Locked",
        generating: "Consulting AI...",
        loading_news: "Curating Daily News...",
        news_error: "Could not fetch news today.",
        buy: "Buy",
        owned: "Owned",
        insufficient: "Need more XP",
        news_too_early: "Next update at 12:00 PM",
        blitz_score: "Blitz Score",
        offline_mode: "Offline Mode"
    },
    hi: {
        welcome: "वापसी पर स्वागत है",
        login_btn: "यात्रा शुरू करें",
        guest: "अतिथि के रूप में खेलें",
        stats: "आंकड़े",
        global_pulse: "वैश्विक समाचार",
        shop: "दुकान",
        badges: "बैज",
        mode_blitz: "ब्लिट्ज मोड",
        desc_blitz: "60 सेकंड। असीमित स्कोर।",
        mode_daily: "दैनिक चुनौती",
        desc_daily: "हर दिन नए प्रश्न।",
        mode_flag: "झंडे",
        desc_flag: "झंडा पहचानें।",
        mode_map: "नक्शा",
        desc_map: "स्थान खोजें।",
        mode_detective: "जासूस",
        desc_detective: "एआई सुराग सुलझाएं।",
        mode_shapes: "आकार",
        desc_shapes: "सीमाओं से अनुमान लगाएं।",
        q_flag: "झंडा पहचानें।",
        q_map: "नक्शे पर {country} खोजें।",
        click_map: "पिन लगाने के लिए नक्शे पर क्लिक करें।",
        distance: "दूरी",
        level: "स्तर",
        xp: "XP",
        streak: "सिलसिला",
        correct: "सही!",
        wrong: "गलत!",
        game_over: "खेल समाप्त",
        you_scored: "आपका स्कोर",
        locked: "बंद",
        generating: "एआई से परामर्श...",
        loading_news: "दैनिक समाचार ला रहे हैं...",
        news_error: "आज समाचार नहीं मिले।",
        buy: "खरीदें",
        owned: "स्वामित्व",
        insufficient: "अधिक XP चाहिए",
        news_too_early: "अगला अपडेट दोपहर 12:00 बजे",
        blitz_score: "ब्लिट्ज स्कोर",
        offline_mode: "ऑफलाइन मोड"
    }
};

const savedUsers = JSON.parse(localStorage.getItem("geoQuizUsers") || "{}");
const savedCurrentUser = localStorage.getItem("geoQuizCurrentUser");
const savedConfig = JSON.parse(localStorage.getItem("geoQuizConfig") || "{}");
const savedNews = JSON.parse(localStorage.getItem("geoQuizNews") || "{}");
const savedLanguage = localStorage.getItem("geoQuizLanguage") || "en";

const DEFAULT_CONFIG = { questionCount: 5, timerDuration: 20, soundEnabled: true };

let state = {
    view: (savedCurrentUser && savedUsers[savedCurrentUser]) ? "MENU" : "LOGIN",
    mode: null,
    score: 0,
    currentIndex: 0,
    questions: [],
    users: savedUsers,
    currentUser: savedCurrentUser || null,
    userData: (savedCurrentUser && savedUsers[savedCurrentUser]) ? savedUsers[savedCurrentUser] : { xp: 0, level: 1, badges: [], history: [], dailyCompleted: [], inventory: [] },
    config: { ...DEFAULT_CONFIG, ...savedConfig },
    language: savedLanguage,
    isLoading: false,
    timer: 20,
    timerInterval: null,
    showProfileMenu: false,
    loginError: null,
    tempXP: 0,
    news: savedNews,
    aiAvailable: true
};

const t = (key) => TRANSLATIONS[state.language][key] || key;

const persistUserData = () => {
    if (state.currentUser && state.currentUser !== "Guest") {
        state.users[state.currentUser] = state.userData;
        localStorage.setItem("geoQuizUsers", JSON.stringify(state.users));
    }
};

// --- AUDIO CONTROLLER ---
const ioController = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
  },
  play(type) {
    if (!state.config.soundEnabled) return;
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    const now = this.ctx.currentTime;

    if (type === 'click') {
        this.vibrate(10);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } 
    else if (type === 'correct') {
        this.vibrate([10, 30, 10]);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } 
    else if (type === 'wrong') {
        this.vibrate([50, 50, 50]);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
    else if (type === 'levelup') {
        this.vibrate([50, 50, 50, 50, 100]);
        [440, 554, 659, 880].forEach((freq, i) => {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.connect(g);
            g.connect(this.ctx.destination);
            o.type = 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.05, now + i*0.1);
            g.gain.exponentialRampToValueAtTime(0.001, now + i*0.1 + 0.3);
            o.start(now + i*0.1);
            o.stop(now + i*0.1 + 0.3);
        });
    }
    else if (type === 'win') {
      const playNote = (freq, time) => {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g);
        g.connect(this.ctx.destination);
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.05, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        o.start(time);
        o.stop(time + 0.5);
      };
      playNote(523.25, now);
      playNote(659.25, now + 0.15);
      playNote(783.99, now + 0.3);
    }
  }
};

// --- AI SERVICE ---
const getClient = () => {
    try {
        const apiKey = process.env.API_KEY;
        if (!apiKey) throw new Error("Missing API Key");
        return new GoogleGenAI({ apiKey: apiKey });
    } catch (e) {
        console.warn("AI Client Init Failed:", e);
        return null;
    }
};

const generateAiQuestion = async (country, mode, lang) => {
    const ai = getClient();
    
    // Try AI Generation First
    if (ai && state.aiAvailable) {
        try {
            const model = "gemini-3-flash-preview";
            const langInstruction = lang === 'hi' ? "in Hindi" : "in English";
            let promptText = "";
            
            if (mode === "DETECTIVE") {
                promptText = `Create a "Case File" for ${country.name} ${langInstruction}. 4 short clues: Climate, Currency, Language, Neighbor. Ask "Which country?"`;
            } else if (mode === "SHAPES") {
                promptText = `Describe the shape of ${country.name} metaphorically ${langInstruction}.`;
            }
            
            const response = await ai.models.generateContent({
                model: model,
                contents: promptText,
                config: { 
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: { question: { type: Type.STRING }, explanation: { type: Type.STRING } }
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("AI Generation Failed (Quota or Network). Switching to Offline Mode.", e);
            state.aiAvailable = false; 
        }
    }

    // Fallback Mode (Offline)
    return getFallbackQuestion(country, mode);
};

const getFallbackQuestion = (country, mode) => {
    if (mode === "DETECTIVE") {
        return {
            question: `CASE FILE:\n\n1. Facts: ${country.facts[0]}\n2. Language: ${country.languages.join(", ")}\n3. Known for: ${country.facts[1]}\n\nWhich country is this?`,
            explanation: "Based on database facts."
        };
    } else if (mode === "SHAPES") {
        return {
            question: `Shape Clue:\n\n${country.shapeDescription || "A unique landmass in its region."}\n\nWhich country?`,
            explanation: "Visual description from database."
        };
    }
    return { question: "Identify this country.", explanation: "" };
};

const fetchDailyNews = async () => {
    const ai = getClient();
    if (ai && state.aiAvailable) {
        try {
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: "Find 3 interesting, trending geography, travel, or cultural news headlines from the last 24 hours. Return a JSON array where each object has 'headline', 'summary' (max 20 words), and 'image_prompt'.",
                config: {
                    tools: [{googleSearch: {}}],
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                headline: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                image_prompt: { type: Type.STRING }
                            }
                        }
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("News Fetch Failed. Using Fallback.", e);
            state.aiAvailable = false;
        }
    }
    return getFallbackNews();
};

const getFallbackNews = () => {
    const shuffled = [...COUNTRIES].sort(() => 0.5 - Math.random()).slice(0, 3);
    return shuffled.map(c => ({
        headline: `Did You Know? - ${c.name}`,
        summary: c.facts[Math.floor(Math.random() * c.facts.length)],
        image_prompt: `A beautiful scenic view of ${c.name} landmarks or nature`
    }));
};

// --- GAME LOGIC ---
const getCountryName = (country) => {
    try {
        return new Intl.DisplayNames([state.language], { type: 'region' }).of(country.code.toUpperCase());
    } catch (e) { return country.name; }
};

const calculateLevel = (xp) => {
    let level = 1;
    let xpNeeded = 500;
    while (xp >= xpNeeded && level < LEVEL_CAP) {
        xp -= xpNeeded;
        level++;
        xpNeeded = level * 500;
    }
    return { level, currentXP: xp, xpToNext: xpNeeded };
};

const addXP = (amount) => {
    state.tempXP += amount;
    state.userData.xp = (state.userData.xp || 0) + amount;
    const oldLevel = state.userData.level || 1;
    const { level } = calculateLevel(state.userData.xp);
    if (level > oldLevel) {
        state.userData.level = level;
        ioController.play('levelup');
    }
    persistUserData();
};

const unlockBadge = (badgeId) => {
    if (!state.userData.badges) state.userData.badges = [];
    if (!state.userData.badges.includes(badgeId)) {
        state.userData.badges.push(badgeId);
        ioController.play('correct');
        persistUserData();
        return true;
    }
    return false;
};

const getDailySeed = () => {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};
const seededRandom = (seed) => {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

const startGame = async (mode) => {
    ioController.play('click');
    state.mode = mode;
    state.score = 0;
    state.tempXP = 0;
    state.currentIndex = 0;
    state.questions = [];
    state.isLoading = true;
    state.view = "QUIZ";
    render();

    let countryPool = [...COUNTRIES];
    let count = state.config.questionCount;

    if (mode === "MAP") countryPool = countryPool.filter(c => c.lat && c.lng);

    if (mode === "DAILY") {
        const seed = getDailySeed();
        for (let i = countryPool.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(seed + i) * (i + 1));
            [countryPool[i], countryPool[j]] = [countryPool[j], countryPool[i]];
        }
        countryPool = countryPool.slice(0, 5);
        count = 5;
    } else if (mode === "BLITZ") {
        countryPool = countryPool.sort(() => Math.random() - 0.5);
        count = 100;
    } else {
        countryPool = countryPool.sort(() => Math.random() - 0.5).slice(0, count);
    }

    const initialBatch = countryPool.slice(0, mode === "BLITZ" ? 50 : count);

    for (const country of initialBatch) {
        let qData = {
            correct: country,
            options: mode === "MAP" ? [] : getRandomDistractors(country),
            userAnswer: null,
            isCorrect: false,
            questionText: "",
            image: null
        };

        if (mode === "DETECTIVE" || mode === "SHAPES") {
            const aiResult = await generateAiQuestion(country, mode, state.language);
            qData.questionText = aiResult ? aiResult.question : "Loading...";
        } else if (mode === "MAP") {
            qData.questionText = t('q_map').replace('{country}', getCountryName(country));
        } else {
            qData.questionText = t('q_flag');
            qData.image = `https://flagcdn.com/w640/${country.code}.png`;
        }
        state.questions.push(qData);
    }

    state.isLoading = false;
    
    if (mode === "BLITZ") state.timer = 60;
    else state.timer = state.config.timerDuration;
    
    startTimer();
    render();
};

const getRandomDistractors = (correct, count = 3) => {
    return COUNTRIES.filter(c => c.code !== correct.code)
        .sort(() => Math.random() - 0.5).slice(0, count)
        .concat(correct).sort(() => Math.random() - 0.5);
};

const startTimer = () => {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.timer--;
        updateTimerUI();
        if (state.timer <= 0) {
            if (state.mode === "BLITZ") endGame();
            else handleAnswer(null);
        }
    }, 1000);
};

const updateTimerUI = () => {
    const el = document.getElementById("timer-display");
    const bar = document.getElementById("timer-progress");
    if (el) {
        el.textContent = state.timer;
        if (state.timer <= 10) el.classList.add("text-red-400", "scale-110");
        else el.classList.remove("text-red-400", "scale-110");
    }
    const max = state.mode === "BLITZ" ? 60 : state.config.timerDuration;
    if (bar) bar.style.width = `${(state.timer / max) * 100}%`;
};

const handleAnswer = (answerData) => {
    if (state.mode !== "BLITZ") clearInterval(state.timerInterval);
    
    const currentQ = state.questions[state.currentIndex];
    let isCorrect = false;
    let xpGain = 0;

    if (state.mode === "MAP") {
        if (answerData) {
            const dist = calculateDistance(answerData.lat, answerData.lng, currentQ.correct.lat, currentQ.correct.lng);
            isCorrect = dist < 600; 
            currentQ.userAnswer = { ...answerData, distance: Math.round(dist) };
            if (isCorrect) {
                if (dist < 50) unlockBadge('cartographer');
                xpGain = 20;
            }
        }
    } else {
        currentQ.userAnswer = answerData;
        isCorrect = answerData && answerData.code === currentQ.correct.code;
        if (isCorrect) xpGain = 10;
    }

    currentQ.isCorrect = isCorrect;
    if (isCorrect) {
        state.score++;
        addXP(xpGain);
        ioController.play('correct');
    } else {
        ioController.play('wrong');
    }

    if (state.mode === "BLITZ") {
        if (state.currentIndex < state.questions.length - 1) {
            state.currentIndex++;
            render();
        } else {
            endGame();
        }
    } else {
        renderQuiz(true);
        setTimeout(() => {
            if (state.currentIndex < state.questions.length - 1) {
                state.currentIndex++;
                state.timer = state.config.timerDuration;
                startTimer();
                render();
            } else {
                endGame();
            }
        }, 1500); 
    }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const endGame = () => {
    clearInterval(state.timerInterval);
    ioController.play('win');
    
    state.userData.history.unshift({ mode: state.mode, date: new Date().toLocaleDateString(), score: state.score, total: state.mode === "BLITZ" ? state.currentIndex + 1 : state.questions.length });

    unlockBadge('first_steps');
    if (state.mode === "BLITZ" && state.score >= 15) unlockBadge('speed_demon');

    if (state.mode === "DAILY") {
        if (!state.userData.dailyCompleted) state.userData.dailyCompleted = [];
        const today = new Date().toDateString();
        if (!state.userData.dailyCompleted.includes(today)) state.userData.dailyCompleted.push(today);
    }

    persistUserData();
    state.view = "RESULT";
    render();
};

const buyItem = (itemId) => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (state.userData.xp >= item.cost) {
        state.userData.xp -= item.cost;
        if (!state.userData.inventory) state.userData.inventory = [];
        state.userData.inventory.push(itemId);
        if (itemId === 'theme_matrix') unlockBadge('big_spender');
        persistUserData();
        ioController.play('correct');
        render(); 
    } else {
        ioController.play('wrong');
    }
};

// --- UI RENDERING ---
const app = document.getElementById("app");
let mapInstance = null;

const render = () => {
    app.innerHTML = "";
    if (state.view !== "LOGIN") app.innerHTML += renderHeader();

    if (state.isLoading) app.innerHTML += renderLoading();
    else {
        switch(state.view) {
            case "LOGIN": app.innerHTML = renderLogin(); break;
            case "MENU": app.innerHTML += renderMenu(); break;
            case "QUIZ": app.innerHTML += renderQuiz(false); break;
            case "RESULT": app.innerHTML += renderResult(); break;
            case "GLOBAL_PULSE": app.innerHTML += renderGlobalPulse(); break;
            case "SHOP": app.innerHTML += renderShop(); break;
            case "BADGES": app.innerHTML += renderBadges(); break;
        }
    }
    
    lucide.createIcons();
    attachEvents();
    if (state.view === "QUIZ" && state.mode === "MAP" && !state.isLoading) setTimeout(initMap, 100); 
    if (state.view === "GLOBAL_PULSE" && (!state.news.date || state.news.date !== new Date().toDateString())) {
        loadNewsContent();
    }
};

const loadNewsContent = async () => {
    const content = document.getElementById('news-content');
    if(content) content.innerHTML = renderLoading();
    
    const result = await fetchDailyNews();
    
    if (result.tooEarly) {
        if (state.view === "GLOBAL_PULSE") render();
    } else {
        state.news = { date: new Date().toDateString(), articles: result };
        localStorage.setItem("geoQuizNews", JSON.stringify(state.news));
        if (state.view === "GLOBAL_PULSE") render();
    }
};

const renderHeader = () => {
    const { level, currentXP, xpToNext } = calculateLevel(state.userData.xp || 0);
    const progress = (currentXP / xpToNext) * 100;

    return `
    <div class="fixed top-0 left-0 w-full p-4 z-40 flex justify-between items-center pointer-events-none">
        <div class="pointer-events-auto flex items-center gap-3">
             <div class="bg-[#28292A] border border-[#444746] rounded-full px-3 py-1 flex items-center gap-2 shadow-lg backdrop-blur-md">
                <div class="text-xs font-bold text-[#FDD663]">LVL ${level}</div>
                <div class="w-16 h-1.5 bg-[#131314] rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-[#A8C7FA] to-[#FDD663]" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="bg-[#28292A] border border-[#444746] rounded-full px-3 py-1 flex items-center gap-1 shadow-lg backdrop-blur-md">
                <i data-lucide="zap" class="w-3 h-3 text-[#A8C7FA]"></i>
                <span class="text-xs font-bold text-[#E3E3E3]">${state.userData.xp} XP</span>
            </div>
        </div>
        <div class="flex gap-3 pointer-events-auto">
            ${!state.aiAvailable ? `<div class="offline-badge">${t('offline_mode')}</div>` : ''}
            <button id="btn-profile" class="w-9 h-9 rounded-full bg-[#28292A] border border-[#444746] flex items-center justify-center text-xs font-bold text-[#A8C7FA] hover:bg-[#333537] shadow-lg">
                ${state.currentUser ? state.currentUser.substring(0, 2).toUpperCase() : "G"}
            </button>
        </div>
    </div>
    ${state.showProfileMenu ? `
        <div class="fixed top-16 right-4 w-48 bg-[#1E1F20] border border-[#444746] rounded-xl shadow-2xl py-2 z-50 animate-fade-in backdrop-blur-md">
            <div class="px-4 py-2 border-b border-[#444746]"><p class="text-sm font-bold text-[#E3E3E3] truncate">${state.currentUser}</p></div>
            <button id="btn-logout" class="w-full text-left px-4 py-2 text-sm text-[#F28B82] hover:bg-[#28292A] flex items-center gap-2"><i data-lucide="log-out" class="w-4 h-4"></i> Logout</button>
        </div>` : ''}
    `;
};

const renderLogin = () => `
  <div class="w-full max-w-sm animate-fade-in flex flex-col gap-6">
     <div class="text-center mb-4">
        <h1 class="text-5xl font-black tracking-tighter mb-2 text-gradient-ai drop-shadow-sm">GeoQuiz Master</h1>
        <p class="text-[#8e918f] text-sm font-medium">Explore. Learn. Conquer.</p>
     </div>
     <div class="ai-card p-8 flex flex-col gap-5">
        <div class="space-y-4">
           <div><label class="block text-xs font-semibold text-[#8e918f] uppercase mb-1.5">Username</label><input type="text" id="login-username" class="w-full ai-input px-4 py-3 rounded-lg text-sm"></div>
           <div><label class="block text-xs font-semibold text-[#8e918f] uppercase mb-1.5">Password</label><input type="password" id="login-password" class="w-full ai-input px-4 py-3 rounded-lg text-sm"></div>
           ${state.loginError ? `<div class="text-[#F28B82] text-xs text-center bg-[#F28B82]/10 py-2 rounded border border-[#F28B82]/20">${state.loginError}</div>` : ''}
           <div class="flex gap-2">
               <button id="btn-login" class="flex-1 ai-btn-primary py-3 rounded-lg text-sm shadow-lg">Sign In</button>
               <button id="btn-register" class="flex-1 ai-btn-secondary py-3 rounded-lg text-sm">Create</button>
           </div>
        </div>
        <button id="btn-guest" class="w-full text-[#8e918f] hover:text-[#E3E3E3] text-sm font-medium pt-2 border-t border-[#444746]">${t('guest')}</button>
     </div>
  </div>
`;

const renderMenu = () => `
  <div class="w-full max-w-6xl animate-fade-in pt-12 pb-12">
    <div class="mb-8 text-center">
      <h1 class="text-6xl font-black text-gradient-ai mb-2 tracking-tighter drop-shadow-2xl">GeoQuiz Master</h1>
      <p class="text-[#C4C7C5] text-lg font-light">${t('desc_daily')}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
      <div class="md:col-span-4 flex flex-col gap-6">
        <div class="ai-card p-6">
            <h3 class="text-xs font-bold text-[#8e918f] uppercase tracking-wider mb-4 border-b border-[#444746] pb-2">${t('stats')}</h3>
            <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-[#131314]/50 p-3 rounded-lg border border-[#444746]">
                    <div class="text-2xl font-bold text-[#FDD663]">${state.userData.level || 1}</div>
                    <div class="text-[10px] text-[#8e918f] uppercase">${t('level')}</div>
                </div>
                <div class="bg-[#131314]/50 p-3 rounded-lg border border-[#444746]">
                    <div class="text-2xl font-bold text-[#81C995]">${state.userData.history ? state.userData.history.reduce((a,b)=>a+b.score,0) : 0}</div>
                    <div class="text-[10px] text-[#8e918f] uppercase">${t('correct')}</div>
                </div>
            </div>
            <div class="flex flex-col gap-2">
                <button id="btn-global-pulse" class="w-full ai-btn-secondary py-2 rounded-lg text-xs flex items-center justify-center gap-2">
                    <i data-lucide="globe" class="w-3 h-3 text-[#A8C7FA]"></i> ${t('global_pulse')}
                </button>
                <button id="btn-shop" class="w-full ai-btn-secondary py-2 rounded-lg text-xs flex items-center justify-center gap-2">
                    <i data-lucide="shopping-bag" class="w-3 h-3 text-[#F28B82]"></i> ${t('shop')}
                </button>
                <button id="btn-badges" class="w-full ai-btn-secondary py-2 rounded-lg text-xs flex items-center justify-center gap-2">
                    <i data-lucide="award" class="w-3 h-3 text-[#FDD663]"></i> ${t('badges')}
                </button>
            </div>
        </div>
      </div>

      <div class="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${renderModeCard("BLITZ", "zap", "text-[#F28B82]", t('mode_blitz'), t('desc_blitz'), true)}
          ${renderModeCard("DAILY", "calendar-check", "text-[#FDD663]", t('mode_daily'), t('desc_daily'), true)}
          ${renderModeCard("FLAG", "flag", "text-[#A8C7FA]", t('mode_flag'), t('desc_flag'))}
          ${renderModeCard("MAP", "map-pin", "text-[#81C995]", t('mode_map'), t('desc_map'))}
          ${renderModeCard("DETECTIVE", "search", "text-[#C4C7C5]", t('mode_detective'), t('desc_detective'))}
          ${renderModeCard("SHAPES", "hexagon", "text-[#A8C7FA]", t('mode_shapes'), t('desc_shapes'))}
      </div>
    </div>
  </div>
`;

const renderModeCard = (mode, icon, colorClass, title, desc, featured=false) => `
  <button class="btn-mode ai-card p-6 text-left group hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden ${featured ? 'sm:col-span-2 bg-[#1E1F20]/80' : ''}" data-mode="${mode}">
     ${featured ? `<div class="absolute top-0 right-0 p-3 opacity-10"><i data-lucide="${icon}" class="w-32 h-32 ${colorClass}"></i></div>` : ''}
     <div class="relative z-10 flex items-start gap-4">
         <div class="w-12 h-12 rounded-xl bg-[#131314] flex items-center justify-center border border-[#444746] group-hover:border-[#E3E3E3] transition-colors shadow-inner">
            <i data-lucide="${icon}" class="w-6 h-6 ${colorClass}"></i>
         </div>
         <div>
             <h3 class="text-lg font-bold text-[#E3E3E3] mb-1 group-hover:text-[#A8C7FA] transition-colors">${title}</h3>
             <p class="text-sm text-[#8e918f] leading-relaxed group-hover:text-[#C4C7C5] transition-colors">${desc}</p>
         </div>
     </div>
  </button>
`;

const renderGlobalPulse = () => {
    const now = new Date();
    const isTooEarly = now.getHours() < 12;

    return `
    <div class="w-full max-w-5xl animate-fade-in pt-12">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-[#E3E3E3] flex items-center gap-3"><i data-lucide="globe" class="w-8 h-8 text-[#A8C7FA]"></i> ${t('global_pulse')}</h2>
            <button id="btn-home" class="p-2 hover:bg-[#28292A] rounded-full text-[#E3E3E3] transition-colors"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div id="news-content" class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${isTooEarly ? `
                <div class="col-span-3 text-center py-20 ai-card">
                    <i data-lucide="clock" class="w-16 h-16 text-[#F28B82] mx-auto mb-4"></i>
                    <h3 class="text-2xl font-bold text-[#E3E3E3] mb-2">${t('news_too_early')}</h3>
                    <p class="text-[#8e918f]">Check back after 12:00 PM for the latest stories.</p>
                </div>
            ` : (!state.news || !state.news.articles) ? renderLoading() : state.news.articles.map(article => `
                <div class="ai-card overflow-hidden flex flex-col h-full group">
                    <div class="h-48 bg-[#131314] relative overflow-hidden">
                        <img src="https://image.pollinations.ai/prompt/${encodeURIComponent(article.image_prompt + ' photorealistic geography travel news')}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="News Image">
                        <div class="absolute inset-0 bg-gradient-to-t from-[#1E1F20] to-transparent opacity-80"></div>
                    </div>
                    <div class="p-5 flex-1 flex flex-col">
                        <h3 class="text-lg font-bold text-[#E3E3E3] mb-2 leading-tight">${article.headline}</h3>
                        <p class="text-sm text-[#8e918f] flex-1">${article.summary}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
};

const renderShop = () => `
    <div class="w-full max-w-4xl animate-fade-in pt-12">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-[#E3E3E3] flex items-center gap-3"><i data-lucide="shopping-bag" class="w-8 h-8 text-[#F28B82]"></i> ${t('shop')}</h2>
            <div class="bg-[#28292A] px-4 py-2 rounded-full border border-[#444746] text-[#E3E3E3] font-bold">${state.userData.xp} XP</div>
            <button id="btn-home" class="p-2 hover:bg-[#28292A] rounded-full text-[#E3E3E3]"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            ${SHOP_ITEMS.map(item => {
                const owned = (state.userData.inventory || []).includes(item.id);
                return `
                <div class="ai-card p-6 flex flex-col items-center text-center relative overflow-hidden">
                    <div class="w-20 h-20 rounded-full bg-[#131314] flex items-center justify-center mb-4 border border-[#444746] shadow-lg">
                        <i data-lucide="${item.icon}" class="w-10 h-10 text-[#FDD663]"></i>
                    </div>
                    <h3 class="font-bold text-[#E3E3E3] mb-1 text-lg">${item.name}</h3>
                    <p class="text-sm text-[#8e918f] mb-4">${item.desc}</p>
                    <button class="btn-buy mt-auto w-full py-2 rounded-lg font-bold text-sm transition-colors ${owned ? 'bg-[#28292A] text-[#8e918f] cursor-default' : (state.userData.xp >= item.cost ? 'ai-btn-primary' : 'bg-[#28292A] text-[#F28B82] cursor-not-allowed')}" data-id="${item.id}" ${owned || state.userData.xp < item.cost ? 'disabled' : ''}>
                        ${owned ? t('owned') : (state.userData.xp < item.cost ? t('insufficient') : `${item.cost} XP`)}
                    </button>
                </div>
                `;
            }).join('')}
        </div>
    </div>
`;

const renderBadges = () => `
    <div class="w-full max-w-4xl animate-fade-in pt-12">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-[#E3E3E3] flex items-center gap-3"><i data-lucide="award" class="w-8 h-8 text-[#A8C7FA]"></i> ${t('badges')}</h2>
            <button id="btn-home" class="p-2 hover:bg-[#28292A] rounded-full text-[#E3E3E3]"><i data-lucide="x" class="w-6 h-6"></i></button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            ${BADGES.map(b => {
                const unlocked = (state.userData.badges || []).includes(b.id);
                return `
                <div class="ai-card p-6 flex flex-col items-center text-center ${unlocked ? '' : 'badge-locked'}">
                    <div class="w-16 h-16 rounded-full bg-[#131314] flex items-center justify-center mb-4 border ${unlocked ? 'border-[#A8C7FA]' : 'border-[#444746]'} shadow-lg">
                        <i data-lucide="${b.icon}" class="w-8 h-8 ${unlocked ? 'text-[#A8C7FA]' : 'text-[#444746]'}"></i>
                    </div>
                    <h3 class="font-bold text-[#E3E3E3] mb-1">${b.title}</h3>
                    <p class="text-xs text-[#8e918f]">${b.desc}</p>
                </div>
                `;
            }).join('')}
        </div>
    </div>
`;

const renderQuiz = (showResult) => {
    const q = state.questions[state.currentIndex];
    const progress = ((state.currentIndex) / state.config.questionCount) * 100;
    const isBlitz = state.mode === "BLITZ";
    
    return `
    <div class="w-full max-w-3xl animate-fade-in pt-8">
       <div class="flex justify-between items-end mb-4 px-1">
          <div>
            <span class="text-[10px] font-bold text-[#A8C7FA] uppercase tracking-widest">${state.mode} MODE</span>
            <div class="text-2xl font-bold text-[#E3E3E3]">
                ${isBlitz ? `${t('blitz_score')}: ${state.score}` : `Q${state.currentIndex + 1} <span class="text-[#444746]">/ ${state.config.questionCount}</span>`}
            </div>
          </div>
          <div class="text-right">
             <div id="timer-display" class="text-4xl font-black font-mono text-[#E3E3E3] ${isBlitz ? 'text-[#F28B82]' : ''}">${state.timer}</div>
          </div>
       </div>

       <div class="w-full h-1 bg-[#1E1F20] rounded-full overflow-hidden mb-8 relative">
          ${!isBlitz ? `<div class="absolute top-0 left-0 h-full bg-[#444746]" style="width: ${progress}%"></div>` : ''}
          <div id="timer-progress" class="absolute top-0 left-0 h-full bg-[#A8C7FA] transition-all duration-1000 linear w-full shadow-[0_0_10px_#A8C7FA]"></div>
       </div>

       <div class="ai-card p-8 mb-6 relative overflow-hidden flex flex-col items-center">
          ${q.image ? `<div class="flex justify-center mb-6"><img src="${q.image}" class="h-40 rounded shadow-2xl border border-[#444746]"></div>` : ''}
          <p class="text-xl text-[#E3E3E3] font-medium leading-8 whitespace-pre-line text-center max-w-2xl">${q.questionText}</p>
          ${state.mode === "MAP" ? `<div class="mt-6 text-center text-sm text-[#A8C7FA] animate-pulse flex items-center gap-2"><i data-lucide="map" class="w-4 h-4"></i>${t('click_map')}</div>` : ''}
       </div>

       ${state.mode === "MAP" 
         ? `<div id="map" class="map-container shadow-2xl border-2 border-[#444746]/50"></div>`
         : `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${q.options.map(c => {
                  let base = "ai-card p-5 text-left font-semibold text-[#C4C7C5] hover:bg-[#28292A] hover:text-[#E3E3E3] transition-all border-[#444746]";
                  let icon = "";
                  if (showResult) {
                      if (c.code === q.correct.code) { base = "bg-[#132a1b] border-[#81C995] text-[#81C995]"; icon = "check-circle"; }
                      else if (q.userAnswer && c.code === q.userAnswer.code) { base = "bg-[#3c1716] border-[#F28B82] text-[#F28B82]"; icon = "x-circle"; }
                      else { base += " opacity-40 grayscale"; }
                  }
                  return `<button class="btn-option ${base} flex items-center justify-between group active:scale-[0.98]" data-code="${c.code}" ${showResult ? 'disabled' : ''}>
                            <span class="group-hover:translate-x-1 transition-transform">${getCountryName(c)}</span>
                            ${icon ? `<i data-lucide="${icon}" class="w-5 h-5"></i>` : `<div class="w-2 h-2 rounded-full bg-[#444746] group-hover:bg-[#A8C7FA] transition-colors shadow-[0_0_5px_rgba(168,199,250,0.5)]"></div>`}
                          </button>`;
              }).join("")}
           </div>`
       }
       
       ${showResult && state.mode === "MAP" ? `
           <div class="mt-4 p-4 ai-card text-center animate-fade-in border ${q.isCorrect ? 'border-[#81C995] bg-[#132a1b]' : 'border-[#F28B82] bg-[#3c1716]'}">
              <p class="text-lg font-bold text-white flex items-center justify-center gap-2">
                 ${q.isCorrect ? `<i data-lucide="check-circle" class="w-5 h-5"></i>` : `<i data-lucide="x-circle" class="w-5 h-5"></i>`}
                 ${q.isCorrect ? t('correct') : t('wrong')}
              </p>
              ${q.userAnswer ? `<p class="text-sm opacity-80 mt-1">${t('distance')}: ${q.userAnswer.distance} km</p>` : ''}
           </div>
       ` : ''}
    </div>
    `;
};

const renderResult = () => {
  const percent = state.mode === "BLITZ" ? 100 : Math.round((state.score / state.questions.length) * 100);
  let title = t('game_over');
  let color = "text-[#A8C7FA]";
  if (percent === 100) { title = "Perfect!"; color = "text-gradient-gold"; }
  else if (percent >= 80) { title = "Legendary!"; color = "text-[#81C995]"; }

  const { level, currentXP, xpToNext } = calculateLevel(state.userData.xp || 0);
  const xpProgress = (currentXP / xpToNext) * 100;

  return `
    <div class="w-full max-w-2xl animate-fade-in flex flex-col items-center gap-8 pt-12 text-center">
       <div class="relative">
          <div class="absolute inset-0 bg-[#A8C7FA] blur-[80px] opacity-10"></div>
          <h1 class="text-8xl font-black mb-4 ${color} tracking-tighter drop-shadow-2xl">${state.score}</h1>
          <h2 class="text-3xl font-bold text-[#E3E3E3]">${title}</h2>
          
          <div class="mt-6 bg-[#131314] border border-[#444746] p-4 rounded-xl w-64 mx-auto">
             <div class="flex justify-between text-xs text-[#8e918f] uppercase mb-1">
                <span>Level ${level}</span>
                <span>${Math.round(currentXP)} / ${xpToNext} XP</span>
             </div>
             <div class="h-2 bg-[#28292A] rounded-full overflow-hidden">
                <div class="h-full bg-[#FDD663]" style="width: ${xpProgress}%"></div>
             </div>
             <div class="text-xs text-[#A8C7FA] mt-2">+${state.tempXP} XP gained</div>
          </div>
       </div>

       <button id="btn-home" class="ai-btn-primary px-8 py-4 rounded-full text-base font-bold shadow-lg shadow-[#A8C7FA]/20 transform hover:scale-105 transition-all">
          Back to Menu
       </button>
    </div>
  `;
};

const renderLoading = () => `
  <div class="flex flex-col items-center justify-center animate-fade-in py-20 h-full">
    <div class="w-16 h-16 border-4 border-[#444746] border-t-[#A8C7FA] rounded-full animate-spin mb-6 shadow-[0_0_15px_#A8C7FA]"></div>
    <h2 class="text-xl font-bold text-[#E3E3E3] animate-pulse">${state.view === "GLOBAL_PULSE" ? t('loading_news') : t('generating')}</h2>
    <p class="text-sm text-[#8e918f] mt-2">${state.aiAvailable ? 'Powered by Google Gemini' : 'Offline Mode Active'}</p>
  </div>
`;

// --- EVENTS & INIT ---
const initMap = () => {
    if (mapInstance) { mapInstance.remove(); }
    mapInstance = L.map('map', { center: [20, 0], zoom: 2, minZoom: 2, maxZoom: 6, zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 20 }).addTo(mapInstance);
    setTimeout(() => { mapInstance.invalidateSize(); }, 100);
    mapInstance.on('click', (e) => {
        const currentQ = state.questions[state.currentIndex];
        if (currentQ.userAnswer !== null) return;
        handleAnswer(e.latlng);
        L.marker(e.latlng).addTo(mapInstance);
        if (currentQ.correct.lat) {
            L.circleMarker([currentQ.correct.lat, currentQ.correct.lng], { color: '#81C995', fillColor: '#81C995', fillOpacity: 0.5, radius: 10 }).addTo(mapInstance);
        }
    });
};

const attachEvents = () => {
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
    
    bind('btn-login', () => {
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        if (state.users[u] && state.users[u].password === p) {
            state.currentUser = u;
            state.userData = state.users[u];
            persistUserData();
            state.view = "MENU";
            localStorage.setItem("geoQuizCurrentUser", u);
            render();
        } else {
            state.loginError = "Invalid credentials";
            render();
        }
    });

    bind('btn-register', () => {
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        if (!u || !p) return;
        state.users[u] = { password: p, xp: 0, level: 1, badges: [], history: [], dailyCompleted: [] };
        state.currentUser = u;
        state.userData = state.users[u];
        localStorage.setItem("geoQuizUsers", JSON.stringify(state.users));
        state.view = "MENU";
        localStorage.setItem("geoQuizCurrentUser", u);
        render();
    });

    bind('btn-guest', () => { state.currentUser = "Guest"; state.view = "MENU"; localStorage.removeItem("geoQuizCurrentUser"); render(); });
    bind('btn-logout', () => { state.currentUser = null; state.view = "LOGIN"; localStorage.removeItem("geoQuizCurrentUser"); render(); });
    bind('btn-profile', (e) => { e.stopPropagation(); state.showProfileMenu = !state.showProfileMenu; render(); });
    bind('btn-global-pulse', () => { state.view = "GLOBAL_PULSE"; render(); });
    bind('btn-shop', () => { state.view = "SHOP"; render(); });
    bind('btn-badges', () => { state.view = "BADGES"; render(); });
    bind('btn-home', () => { state.view = "MENU"; state.mode = null; render(); });

    document.querySelectorAll('.btn-mode').forEach(b => b.addEventListener('click', () => startGame(b.dataset.mode)));
    document.querySelectorAll('.btn-option').forEach(b => {
        b.addEventListener('click', () => {
            const code = b.dataset.code;
            const country = state.questions[state.currentIndex].options.find(c => c.code === code);
            handleAnswer(country);
        });
    });
    document.querySelectorAll('.btn-buy').forEach(b => {
        b.addEventListener('click', () => buyItem(b.dataset.id));
    });

    if(state.showProfileMenu) document.addEventListener('click', () => { state.showProfileMenu = false; render(); }, {once:true});
};

// Start
render();
