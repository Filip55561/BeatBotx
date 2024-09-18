const express = require('express');
const session = require('express-session');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { client } = require('./index.js'); // Adjust path if necessary

const app = express();
const port = process.env.PORT || 8000;

// Middleware to serve static files from the public folder
app.use(express.static('public'));

// Session setup
app.use(session({
    secret: process.env.PASSWORD, // Replace with a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } // Set to true if using HTTPS
}));

app.use(express.urlencoded({ extended: true })); // Middleware to parse form data

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

// Routes for serving the login and register HTML pages
app.get('/', (req, res) => {
    res.sendFile('login.html', { root: 'public' });
});

app.get('/register', (req, res) => {
    res.sendFile('register.html', { root: 'public' });
});

// Registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const users = readUsers();

    // Check if username already exists
    if (users.find(user => user.username === username)) {
        return res.send('Username already exists. <a href="/register">Try again</a>.');
    }

    // Hash password and store user
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
        req.session.authenticated = true; // Mark the user as authenticated
        req.session.username = username; // Store username in session
        return res.redirect('/dashboard/'); // Redirect to the dashboard
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

        guildList += 
            `<div class="guild">
                <h3>${guild.name}</h3>
                <p><strong>Member Count:</strong> ${guild.memberCount}</p>
                <h4>Channels:</h4>
                <div class="channel-list">${channels || 'No channels found.'}</div>
                <h4>Roles:</h4>
                <ul>${roles}</ul>
            </div>
            <hr />`;
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
});

// Text channel messages route
app.get('/guild/:guildId/channel/:channelId', checkAuth, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.status(404).send('Guild not found');

    const channel = guild.channels.cache.get(req.params.channelId);
    if (!channel || !channel.isTextBased()) return res.status(404).send('Text channel not found');

    try {
        const messages = await channel.messages.fetch({ limit: 50 });

        // Sort messages by date (descending order)
        const sortedMessages = messages.sort((a, b) => b.createdTimestamp - a.createdTimestamp);

        // Prepare message list
        let messageList = sortedMessages.map(msg => {
            return `<li>
                <strong>[${msg.author.tag}]:</strong> 
                <span>${msg.content}</span>
                <br />
                <small>${msg.createdAt.toLocaleString()}</small>
            </li>`;
        }).join('');

        res.send(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Messages in #${channel.name}</title>
                <link rel="stylesheet" href="/styles.css">
            </head>
            <body>
                <div class="container">
                    <h2>Messages in #${channel.name}</h2>
                    <ul class="message-list">${messageList || 'No messages found.'}</ul>
                    <p><a href="/dashboard/">Back to Dashboard</a></p>
                </div>
            </body>
            </html>`
        );
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send('Error fetching messages');
    }
});


// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy session
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
    console.log(`Server running on port ${port}`);
});
