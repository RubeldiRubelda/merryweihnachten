const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const { kv } = require('@vercel/kv');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ INITIALIERE NUTZER MIT GRUPPENZUTEILUNG ============

// Nutzer-Daten mit bereinigten Telefonnummern (ohne Klammern)
const usersData = [
    { name: "Penuel Fanantenana", phone: "0793004064" },
    { name: "Luana Behrens", phone: "0413100554" },
    { name: "Lukas Kunz", phone: "0798508218" },
    { name: "Annina Bachmann", phone: "0774888696" },
    { name: "Alma Meyer", phone: "0415481656" },
    { name: "Alisha Behrens", phone: "0764783308" },
    { name: "juanita tambwe", phone: "0796201898" },
    { name: "Fatima Keziah Mayhew", phone: "0768222202" },
    { name: "Tim Witzig", phone: "0000000000" },
    { name: "Matti Witzig", phone: "0794052857" },
    { name: "Fabian Jung", phone: "0792422432" },
    { name: "Benjamin Kunz", phone: "0772667126" },
    { name: "Timea Meili", phone: "0765305345" },
    { name: "Nisida Lüthi", phone: "0788849671" },
    { name: "Kuya Salve", phone: "0768198733" },
    { name: "David Gaurilyk", phone: "0798862213" },
    { name: "Noe Deon", phone: "0774805627" }
];

// Gruppen-Namen
const groupNames = ["Team Rot", "Team Blau", "Team Grün", "Team Gelb"];

// ============ PERSISTENTER STORAGE MIT VERCEL KV ============

// Helper-Funktionen für KV Storage
async function getUsers() {
    try {
        const users = await kv.get('christmas_users');
        if (!users) {
            // Initialisiere Users wenn noch nicht vorhanden
            const initialUsers = {};
            usersData.forEach((userData) => {
                initialUsers[userData.phone] = {
                    name: userData.name,
                    group: '',
                    points: 0,
                    task: '',
                    createdAt: new Date().toLocaleString('de-DE')
                };
            });
            await kv.set('christmas_users', initialUsers);
            console.log(`✅ ${usersData.length} Nutzer initialisiert`);
            return initialUsers;
        }
        return users;
    } catch (error) {
        console.error('KV Error:', error);
        // Fallback zu In-Memory
        return {};
    }
}

async function saveUsers(users) {
    try {
        await kv.set('christmas_users', users);
    } catch (error) {
        console.error('KV Save Error:', error);
    }
}

async function getAdminTokens() {
    try {
        console.log('🔍 Lade Admin-Tokens aus KV...');
        const tokens = await kv.get('admin_tokens');
        const tokenSet = tokens ? new Set(tokens) : new Set();
        console.log('📦 Tokens geladen:', tokenSet.size, 'Tokens');
        return tokenSet;
    } catch (error) {
        console.error('❌ KV Error beim Laden:', error);
        return new Set();
    }
}

async function saveAdminTokens(tokens) {
    try {
        const tokenArray = Array.from(tokens);
        console.log('💾 Speichere', tokenArray.length, 'Tokens in KV...');
        await kv.set('admin_tokens', tokenArray);
        console.log('✅ Tokens gespeichert');
    } catch (error) {
        console.error('❌ KV Save Error:', error);
        throw error; // Wichtig: Fehler weitergeben!
    }
}

const ADMIN_PASSWORD = 'admin123';

// ============ USER ROUTES ============

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    const { phoneNumber, name } = req.body;
    
    if (!phoneNumber || !name) {
        return res.status(400).json({ error: 'Telefonnummer und Name erforderlich' });
    }

    const users = await getUsers();
    
    if (!users[phoneNumber]) {
        users[phoneNumber] = { 
            name: name,
            group: '', 
            points: 0, 
            task: '', 
            createdAt: new Date().toLocaleString('de-DE')
        };
        await saveUsers(users);
    }
    
    // Einfacher Token für den Spieler
    const token = Buffer.from(phoneNumber).toString('base64');
    
    res.json({ success: true, redirect: '/dashboard', token: token });
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/user', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    
    const phoneNumber = Buffer.from(token, 'base64').toString();
    const users = await getUsers();
    
    if (users[phoneNumber]) {
        res.json(users[phoneNumber]);
    } else {
        res.status(401).json({ error: 'Nicht angemeldet' });
    }
});

app.post('/logout', (req, res) => {
    res.json({ success: true, redirect: '/login' });
});

// ============ ADMIN ROUTES ============

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.post('/admin-login', async (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        // Erstelle einen Admin-Token
        const adminToken = Buffer.from(`admin_${Date.now()}_${Math.random()}`).toString('base64');
        console.log('🔐 Admin-Login: Token erstellt:', adminToken.substring(0, 20) + '...');
        
        const tokens = await getAdminTokens();
        console.log('📦 Vorhandene Tokens:', tokens.size);
        
        tokens.add(adminToken);
        await saveAdminTokens(tokens);
        console.log('✅ Token gespeichert. Gesamt:', tokens.size);
        
        // Verifiziere, dass Token gespeichert wurde
        const verifyTokens = await getAdminTokens();
        console.log('🔍 Verifikation: Token in KV?', verifyTokens.has(adminToken));
        
        res.json({ success: true, redirect: '/admin', adminToken: adminToken });
    } else {
        res.status(401).json({ error: 'Falsches Passwort' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Middleware zum Überprüfen des Admin-Tokens
async function checkAdminToken(req, res, next) {
    const adminToken = req.headers.authorization?.split(' ')[1];
    console.log('🔍 checkAdminToken: Token empfangen:', adminToken ? adminToken.substring(0, 20) + '...' : 'KEIN TOKEN');
    
    if (!adminToken) {
        console.log('❌ Kein Token im Header');
        return res.status(403).json({ error: 'Nicht autorisiert' });
    }
    
    const tokens = await getAdminTokens();
    console.log('📦 Tokens in KV:', tokens.size, 'Tokens');
    console.log('🔍 Token vorhanden?', tokens.has(adminToken));
    
    if (!tokens.has(adminToken)) {
        console.log('❌ Token nicht in KV gefunden');
        return res.status(403).json({ error: 'Nicht autorisiert' });
    }
    
    console.log('✅ Token validiert');
    next();
}

app.post('/admin/logout', async (req, res) => {
    const adminToken = req.headers.authorization?.split(' ')[1];
    if (adminToken) {
        const tokens = await getAdminTokens();
        tokens.delete(adminToken);
        await saveAdminTokens(tokens);
    }
    res.json({ success: true });
});

app.get('/api/admin/users', checkAdminToken, async (req, res) => {
    const users = await getUsers();
    const userList = Object.entries(users).map(([phone, data]) => ({
        phoneNumber: phone,
        ...data
    }));
    
    res.json(userList);
});

app.get('/api/admin/groups', checkAdminToken, async (req, res) => {
    const users = await getUsers();
    const groups = [...new Set(Object.values(users).map(u => u.group).filter(g => g))];
    res.json(groups);
});

app.post('/api/admin/add-user', checkAdminToken, async (req, res) => {
    const { phoneNumber, name } = req.body;
    
    if (!phoneNumber || !name) {
        return res.status(400).json({ error: 'Telefonnummer und Name erforderlich' });
    }

    const users = await getUsers();
    if (!users[phoneNumber]) {
        users[phoneNumber] = { 
            name: name,
            group: '', 
            points: 0, 
            task: '', 
            createdAt: new Date().toLocaleString('de-DE')
        };
        await saveUsers(users);
        res.json({ success: true, message: 'Benutzer hinzugefügt' });
    } else {
        res.status(400).json({ error: 'Benutzer existiert bereits' });
    }
});

app.post('/api/admin/assign-group', checkAdminToken, async (req, res) => {
    const { phoneNumber, group } = req.body;
    
    const users = await getUsers();
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    users[phoneNumber].group = group;
    await saveUsers(users);
    res.json({ success: true, message: 'Gruppe zugewiesen' });
});

app.post('/api/admin/assign-points', checkAdminToken, async (req, res) => {
    const { phoneNumber, points, game } = req.body;
    
    const users = await getUsers();
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    const pointsValue = parseInt(points) || 0;
    users[phoneNumber].points += pointsValue;
    await saveUsers(users);
    
    res.json({ success: true, message: `${pointsValue} Punkte für "${game}" vergeben` });
});

app.post('/api/admin/set-points', checkAdminToken, async (req, res) => {
    const { phoneNumber, points } = req.body;
    
    const users = await getUsers();
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    users[phoneNumber].points = parseInt(points) || 0;
    await saveUsers(users);
    res.json({ success: true, message: 'Punkte aktualisiert' });
});

app.post('/api/admin/assign-task', checkAdminToken, async (req, res) => {
    const { phoneNumber, task } = req.body;
    
    const users = await getUsers();
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    users[phoneNumber].task = task;
    await saveUsers(users);
    
    res.json({ success: true, message: 'Aufgabe zugewiesen' });
});

app.delete('/api/admin/delete-user/:phoneNumber', checkAdminToken, async (req, res) => {
    const { phoneNumber } = req.params;
    
    const users = await getUsers();
    if (users[phoneNumber]) {
        delete users[phoneNumber];
        await saveUsers(users);
        res.json({ success: true, message: 'Benutzer gelöscht' });
    } else {
        res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }
});

app.get('/api/admin/search-user/:phoneNumber', checkAdminToken, async (req, res) => {
    const { phoneNumber } = req.params;
    
    const users = await getUsers();
    if (users[phoneNumber]) {
        res.json({ phoneNumber, ...users[phoneNumber] });
    } else {
        res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    const users = await getUsers();
    const leaderboard = Object.entries(users)
        .map(([phone, data]) => ({
            phoneNumber: phone,
            name: data.name,
            group: data.group,
            points: data.points
        }))
        .sort((a, b) => b.points - a.points);
    
    res.json(leaderboard);
});

// Root Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Fehlerbehandlung
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Serverfehler' });
});

// Starte Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🎄 Weihnachtsfeier-Website läuft auf Port ${PORT}`);
    console.log(`📱 Spieler-Login: http://localhost:${PORT}/login`);
    console.log(`👨‍💼 Admin-Panel: http://localhost:${PORT}/admin-login`);
    console.log(`🔑 Standard Admin-Passwort: admin123\n`);
});

module.exports = app;
