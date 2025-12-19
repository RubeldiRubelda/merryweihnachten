const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

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

// Initialisiere Users OHNE Gruppenzuteilung (Admin teilt manuell ein)
function initializeUsers() {
    const users = {};
    
    usersData.forEach((userData) => {
        users[userData.phone] = {
            name: userData.name,
            group: '', // Leer - wird vom Admin manuell zugewiesen
            points: 0,
            task: '',
            createdAt: new Date().toLocaleString('de-DE')
        };
    });
    
    // Logging
    console.log(`\n📊 Initialisiere ${usersData.length} Nutzer (ohne Gruppen)`);
    console.log(`✅ Nutzer sind bereit - Gruppen können im Admin-Panel manuell zugewiesen werden\n`);
    
    return users;
}

// In-memory storage (mit einfachem Token-Auth für Vercel)
let users = initializeUsers();
let adminTokens = new Set();
const ADMIN_PASSWORD = 'admin123';

// ============ USER ROUTES ============

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { phoneNumber, name } = req.body;
    
    if (!phoneNumber || !name) {
        return res.status(400).json({ error: 'Telefonnummer und Name erforderlich' });
    }

    if (!users[phoneNumber]) {
        users[phoneNumber] = { 
            name: name,
            group: '', 
            points: 0, 
            task: '', 
            createdAt: new Date().toLocaleString('de-DE')
        };
    }
    
    // Einfacher Token für den Spieler
    const token = Buffer.from(phoneNumber).toString('base64');
    
    res.json({ success: true, redirect: '/dashboard', token: token });
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/user', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Nicht angemeldet' });
    }
    
    const phoneNumber = Buffer.from(token, 'base64').toString();
    
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

app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        // Erstelle einen Admin-Token
        const adminToken = Buffer.from(`admin_${Date.now()}_${Math.random()}`).toString('base64');
        adminTokens.add(adminToken);
        
        res.json({ success: true, redirect: '/admin', adminToken: adminToken });
    } else {
        res.status(401).json({ error: 'Falsches Passwort' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Middleware zum Überprüfen des Admin-Tokens
function checkAdminToken(req, res, next) {
    const adminToken = req.headers.authorization?.split(' ')[1];
    if (!adminToken || !adminTokens.has(adminToken)) {
        return res.status(403).json({ error: 'Nicht autorisiert' });
    }
    next();
}

app.post('/admin/logout', (req, res) => {
    const adminToken = req.headers.authorization?.split(' ')[1];
    if (adminToken) {
        adminTokens.delete(adminToken);
    }
    res.json({ success: true });
});

app.get('/api/admin/users', checkAdminToken, (req, res) => {
    const userList = Object.entries(users).map(([phone, data]) => ({
        phoneNumber: phone,
        ...data
    }));
    
    res.json(userList);
});

app.get('/api/admin/groups', checkAdminToken, (req, res) => {
    const groups = [...new Set(Object.values(users).map(u => u.group).filter(g => g))];
    res.json(groups);
});

app.post('/api/admin/add-user', checkAdminToken, (req, res) => {
    const { phoneNumber, name } = req.body;
    
    if (!phoneNumber || !name) {
        return res.status(400).json({ error: 'Telefonnummer und Name erforderlich' });
    }

    if (!users[phoneNumber]) {
        users[phoneNumber] = { 
            name: name,
            group: '', 
            points: 0, 
            task: '', 
            createdAt: new Date().toLocaleString('de-DE')
        };
        res.json({ success: true, message: 'Benutzer hinzugefügt' });
    } else {
        res.status(400).json({ error: 'Benutzer existiert bereits' });
    }
});

app.post('/api/admin/assign-group', checkAdminToken, (req, res) => {
    const { phoneNumber, group } = req.body;
    
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    users[phoneNumber].group = group;
    res.json({ success: true, message: 'Gruppe zugewiesen' });
});

app.post('/api/admin/assign-points', checkAdminToken, (req, res) => {
    const { phoneNumber, points, game } = req.body;
    
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    const pointsValue = parseInt(points) || 0;
    users[phoneNumber].points += pointsValue;
    
    res.json({ success: true, message: `${pointsValue} Punkte für "${game}" vergeben` });
});

app.post('/api/admin/set-points', checkAdminToken, (req, res) => {
    const { phoneNumber, points } = req.body;
    
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    users[phoneNumber].points = parseInt(points) || 0;
    res.json({ success: true, message: 'Punkte aktualisiert' });
});

app.post('/api/admin/assign-task', checkAdminToken, (req, res) => {
    const { phoneNumber, task } = req.body;
    
    if (!users[phoneNumber]) {
        return res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }

    users[phoneNumber].task = task;
    
    res.json({ success: true, message: 'Aufgabe zugewiesen' });
});

app.delete('/api/admin/delete-user/:phoneNumber', checkAdminToken, (req, res) => {
    const { phoneNumber } = req.params;
    
    if (users[phoneNumber]) {
        delete users[phoneNumber];
        res.json({ success: true, message: 'Benutzer gelöscht' });
    } else {
        res.status(400).json({ error: 'Benutzer nicht gefunden' });
    }
});

app.get('/api/admin/search-user/:phoneNumber', checkAdminToken, (req, res) => {
    const { phoneNumber } = req.params;
    
    if (users[phoneNumber]) {
        res.json({ phoneNumber, ...users[phoneNumber] });
    } else {
        res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
});

app.get('/api/leaderboard', (req, res) => {
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
