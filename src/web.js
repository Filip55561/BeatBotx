require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store); // Sequelize session store
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { User, sequelize } = require('./database'); // Import User model and Sequelize instance
const { client } = require('./index.js'); // Your Discord bot's client
const secret = process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex');

const app = express();
const port = process.env.PORT || 8000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Session store using Sequelize
const sessionStore = new SequelizeStore({
    db: sequelize,
});

// Session setup with Sequelize store
app.use(session({
    secret: secret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Sync the session store with the database
sessionStore.sync();

app.use(express.urlencoded({ extended: true }));
sequelize.sync();

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: '.' });
});

app.get('/register', (req, res) => {
    res.sendFile('register.html', { root: 'public' });
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.send('Username already exists. <a href="/register">Try again</a>.');
        }

        // Hash the password and store the user
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ username, password: hashedPassword });

        res.send('Registration successful! <a href="/">Login</a>');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('An error occurred during registration. Please try again.');
    }
});

app.post('/', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user in the database
        const user = await User.findOne({ where: { username } });
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.authenticated = true;
            req.session.username = username;
            return res.redirect('/dashboard/');
        }

        res.send('Invalid username or password. <a href="/">Try again</a>.');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('An error occurred during login. Please try again.');
    }
});

function checkAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/');
    }
}

// Dashboard route (protected)
app.get('/dashboard/', checkAuth, async (req, res) => {
    let guildList = '';
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
                    <img src="https://query.hicoria.com/query.php?user=mcx_412502" alt="server status">
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

// Fetch messages from a channel
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

        res.send(`<!DOCTYPE html>
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
        </html>`);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send('Error fetching messages.');
    }
});

// Fetch audit logs
app.get('/guild/:guildId/audit-log', checkAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Guild not found');

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
        const auditLogs = await guild.fetchAuditLogs({ limit: 100 });
        const logs = auditLogs.entries.map(entry => {
            const actionDescription = actionDescriptions[entry.action] || 'Unknown Action';
            return {
                action: actionDescription,
                target: entry.target ? entry.target.tag || entry.target.name : 'Unknown',
                executor: entry.executor ? entry.executor.tag : 'Unknown',
                timestamp: entry.createdTimestamp
            };
        });

        let logList = logs.map(log => `
            <div class="log-entry">
                <strong>Action:</strong> ${log.action}<br>
                <strong>Target:</strong> ${log.target}<br>
                <strong>Executor:</strong> ${log.executor}<br>
                <strong>Timestamp:</strong> ${new Date(log.timestamp).toLocaleString()}
            </div>
            <hr />
        `).join('');

        res.send(`<!DOCTYPE html>
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
                ${logList || 'No audit logs found'}
                <p><a href="/dashboard/">Back to Dashboard</a></p>
            </div>
        </body>
        </html>`);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).send('Error fetching audit logs.');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.send('You have been logged out. <a href="/">Login again</a>.');
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
