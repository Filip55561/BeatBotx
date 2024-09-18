require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { client } = require('./index.js');
const crypto = require('crypto');
const secret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');

const app = express();
const port = process.env.PORT || 8000;

app.use(express.static('public'));

// Session setup
app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(express.urlencoded({ extended: true }));

// User management functions
function readUsers() {
    if (!fs.existsSync('users.json')) {
        return [];
    }
    const data = fs.readFileSync('users.json');
    return JSON.parse(data);
}

function writeUsers(users) {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

app.get('/', (req, res) => {
    res.sendFile('index.html', {root: '.'});
});

app.get('/register', (req, res) => {
    res.sendFile('register.html', { root: 'public' });
});

// Registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    if (users.find(user => user.username === username)) {
        return res.send('Username already exists. <a href="/register">Try again</a>.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    writeUsers(users);

    res.send('Registration successful! <a href="/">Login</a>');
});

// Handle login form submission
app.post('/', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    // Find user
    const user = users.find(user => user.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.authenticated = true; 
        req.session.username = username; 
        return res.redirect('/dashboard/');
    }

    res.send('Invalid username or password. <a href="/">Try again</a>.');
});

// Middleware to check authentication
function checkAuth(req, res, next) {
    if (req.session.authenticated) {
        next(); // User is authenticated, proceed to the next middleware/route
    } else {
        res.redirect('/'); // Redirect to login if not authenticated
    }
}

// Protect the main dashboard route
app.get('/dashboard/', checkAuth, async (req, res) => {
    let guildList = '';
    console.log('Session:', req.session);

    try {
        for (const [guildId, guild] of client.guilds.cache) {
            const channels = guild.channels.cache
                .filter(channel => channel.isTextBased())
                .map(channel => {
                    return `
                        <div class="channel">
                            <a href="/guild/${guildId}/channel/${channel.id}">
                                <h4># ${channel.name}</h4>
                            </a>
                        </div>
                    `;
                }).join('');

            const roles = guild.roles.cache.map(role => {
                return `<li>${role.name}</li>`;
            }).join('');

            guildList += `
                <div class="guild">
                    <h3>${guild.name}</h3>
                    <p><strong>Member Count:</strong> ${guild.memberCount}</p>
                    <h4>Channels:</h4>
                    <div class="channel-list">${channels || 'No channels found.'}</div>
                    <h4>Roles:</h4>
                    <ul>${roles}</ul>
                    <p><a href="/guild/${guildId}/audit-log">View Audit Log</a></p>
                </div>
                <hr />
            `;
        }

        res.send(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Discord Bot Dashboard</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <h1>Discord Bot Dashboard</h1>
                    <div class="guild-info">
                        <h2>Your Servers:</h2>
                        ${guildList || 'No guilds found.'}
                    </div>
                    <p><a href="/logout">Logout</a></p>
                </div>
            </body>
            </html>`
        );
    } catch (error) {
        console.error('Error fetching guilds or channels:', error);
        res.status(500).send('Error loading dashboard. Please try again later.');
    }
});

app.get('/guild/:guildId/channel/:channelId', checkAuth, async (req, res) => {
    const { guildId, channelId } = req.params;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).send('Guild not found');
    
    const channel = guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        return res.status(404).send('Channel not found or not a text-based channel');
    }

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const messageList = messages.map(msg => {
            const embedList = msg.embeds.map(embed => `
                <div class="embed">
                    <strong>${embed.title || 'No title'}</strong><br>
                    <p>${embed.description || 'No description'}</p>
                </div>
            `).join('');
            return `
                <div class="message">
                    <strong>${msg.author.tag}</strong>: ${msg.content}
                    ${embedList}
                </div>
            `;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Channel - ${channel.name}</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>Channel: #${channel.name}</h2>
                    <div class="message-list">
                        ${messageList || 'No messages found'}
                    </div>
                    <p><a href="/dashboard/">Back to Dashboard</a></p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send('Error fetching messages.');
    }
});


// Text channel messages route
app.get('/audit-log/:guildId', checkAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Guild not found');

    try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 20 });
        const auditEntries = auditLogs.entries.map(entry => {
            const user = entry.executor ? entry.executor.tag : 'Unknown User';
            return `
                <div class="audit-entry">
                    <div class="audit-header">
                        <span>${entry.action}</span>
                        <span class="audit-date">${entry.createdAt.toLocaleString()}</span>
                    </div>
                    <div class="audit-body">
                        <div><strong>Executor:</strong> ${user}</div>
                        <div><strong>Target:</strong> ${entry.target}</div>
                        <pre><strong>Changes:</strong> ${JSON.stringify(entry.changes, null, 2)}</pre>
                    </div>
                </div>
            `;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Audit Log - ${guild.name}</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="audit-log-container">
                    <h2>Audit Log for ${guild.name}</h2>
                    ${auditEntries || 'No audit log entries found.'}
                    <a href="/dashboard/">Back to Dashboard</a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).send('Error fetching audit logs.');
    }
});

app.get('/guild/:guildId/audit-log', checkAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Guild not found');

    // Compact action descriptions
    const actionDescriptions = {
        1: "Member Banned", 2: "Member Unbanned", 20: "Channel Created",
        21: "Channel Updated", 22: "Channel Deleted", 23: "Overwrite Created",
        24: "Overwrite Updated", 25: "Overwrite Deleted", 26: "Member Kicked",
        27: "Member Pruned", 28: "Member Updated", 30: "Role Created",
        31: "Role Updated", 32: "Role Deleted", 40: "Invite Created",
        41: "Invite Updated", 42: "Invite Deleted", 50: "Webhook Created",
        51: "Webhook Updated", 52: "Webhook Deleted", 60: "Emoji Created",
        61: "Emoji Updated", 62: "Emoji Deleted", 72: "Message Deleted",
        74: "Message Bulk Deleted", 75: "Message Pinned", 76: "Message Unpinned",
        80: "Integration Created", 81: "Integration Updated", 82: "Integration Deleted",
        83: "Stage Instance Created", 84: "Stage Instance Updated", 85: "Stage Instance Deleted"
    };

    try {
        const auditLogs = await guild.fetchAuditLogs({ limit: 20 });
        const logs = auditLogs.entries.map(entry => {
            const actionDescription = actionDescriptions[entry.action] || 'Unknown Action';
            return {
                action: actionDescription,
                executor: entry.executor.tag,
                target: entry.target ? entry.target.tag || entry.target.name : 'N/A',
                reason: entry.reason || 'No reason provided',
                createdAt: entry.createdAt.toLocaleString(),
            };
        });

        let logRows = logs.map(log => `
            <tr>
                <td>${log.action}</td>
                <td>${log.executor}</td>
                <td>${log.target}</td>
                <td>${log.reason}</td>
                <td>${log.createdAt}</td>
            </tr>
        `).join('');

        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Audit Log - ${guild.name}</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>Audit Log for ${guild.name}</h2>
                    <table class="audit-log-table">
                        <thead>
                            <tr>
                                <th>Action</th>
                                <th>Executor</th>
                                <th>Target</th>
                                <th>Reason</th>
                                <th>Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logRows || '<tr><td colspan="5">No audit logs found.</td></tr>'}
                        </tbody>
                    </table>
                    <p><a href="/dashboard/">Back to Dashboard</a></p>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error fetching audit log:', error);
        res.status(500).send('Error fetching audit log');
    }
});


// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('You have been logged out. <a href="/">Login again</a>.');
});

// Route to trigger bot shutdown
app.post('/shutdown', (req, res) => {
    res.send('<h1>Shutting down bot...</h1>');
    console.log('Bot is shutting down via dashboard.');
    client.destroy();
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
