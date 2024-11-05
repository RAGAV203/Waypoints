const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors'); // Import the CORS middleware
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins (modify if you want specific origin control)
        methods: ["GET", "POST"]
    }
});

app.use(cors()); // Apply CORS to all routes
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Listen for incoming connections from the Python client
io.on('connection', (socket) => {
    console.log('A client connected:', socket.id);

    // Listen for 'servoAngles' events from the web client and emit to Python client
    socket.on('processed_frame', (angles) => {
        console.log('Received servo angles:', angles);
        const angleString = angles.x.toString() +","+ angles.y.toString()+"," + angles.z.toString()+"," + angles.c.toString();
    
        io.emit('processed_frame', angleString);
    });

    socket.on('disconnect', () => {
        console.log('A client disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
