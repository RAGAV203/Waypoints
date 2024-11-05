// DOM Elements
const cameraFeed = document.getElementById('camera-feed');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const waypointsList = document.getElementById('waypoints-list');
const zoomInput = document.getElementById('zoom');
const deleteLastPointBtn = document.getElementById('delete-last-point');
const launchBtn = document.getElementById('launch-btn');

// Dynamic constraints based on screen size
let wrist_x_min, wrist_x_max, wrist_y_min, wrist_y_max, palm_size_min, palm_size_max;

// Fixed servo angle constraints
const x_min = 0;
const x_mid = 75;
const x_max = 150;
const y_min = 0;
const y_mid = 90;
const y_max = 180;
const z_min = 0;
const z_mid = 25;
const z_max = 50;

// Initialize and update screen-based constraints
function updateScreenConstraints() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Dynamically set wrist constraints based on screen dimensions
    wrist_x_min = 0;
    wrist_x_max = screenWidth * 1.5; // Adjust based on screen width
    wrist_y_min = 0.5;
    wrist_y_max = 3.0;
    
    // Adjust palm size constraints based on screen height
    palm_size_min = Math.round(screenHeight * 0.01); // 1% of screen height
    palm_size_max = Math.round(screenHeight * 0.8); // 80% of screen height
    
    // Update canvas dimensions
    canvas.width = screenWidth;
    canvas.height = screenHeight;
}

// Initialize constraints
updateScreenConstraints();

function mapRange(value, min1, max1, min2, max2) {
    return min2 + ((value - min1) * (max2 - min2)) / (max1 - min1);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function calculateServoAngles(x, y, z) {
    const servoAngle = [0, 0, 0, 0];
    
    // Dynamically map coordinates to servo angles based on screen constraints
    const clampedX = clamp(x, wrist_x_min, wrist_x_max);
    servoAngle[0] = Math.round(mapRange(clampedX, wrist_x_min, wrist_x_max, x_max, x_min));
    
    const clampedY = clamp(y, wrist_y_min, wrist_y_max);
    servoAngle[1] = Math.round(mapRange(clampedY, wrist_y_min, wrist_y_max, y_max, y_min));
    
    const clampedZ = clamp(z, palm_size_min, palm_size_max);
    servoAngle[2] = 180 - Math.round(mapRange(clampedZ, palm_size_min, palm_size_max, z_max, z_min));
    
    return servoAngle;
}

// Camera initialization with error handling
async function initializeCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraFeed.srcObject = stream;
    } catch (err) {
        console.error("Camera initialization error:", err);
        // Add fallback or error message for users
        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.backgroundColor = '#2c3e50';
    }
}

initializeCamera();

// Load and handle marker image
const markerImage = new Image();
markerImage.src = '/gps.png';
markerImage.onerror = () => {
    console.error('Marker image failed to load');
    // Fallback to drawing a circle if image fails to load
    markerImage.fallback = true;
};

// State management
let waypoints = [];
let isDragging = false;
let selectedPointIndex = null;
let editingPointIndex = null;
const dragRadius = Math.min(window.innerWidth, window.innerHeight) * 0.1; // Responsive drag radius

// Waypoint list management
function updateWaypointList() {
    waypointsList.innerHTML = '';
    waypoints.forEach((point, index) => {
        const pointItem = document.createElement('div');
        pointItem.classList.add('point-item');
        const servoAngles = calculateServoAngles(point.x, point.y, point.z);
        
        // Create a more detailed point item with edit/delete buttons
        pointItem.innerHTML = `
            <span>Point ${index}</span>
            <div class="point-details">
                <span>X: ${servoAngles[0]}</span>
                <span>Y: ${servoAngles[1]}</span>
                <span>Z: ${servoAngles[2]}</span>
            </div>
        `;
        
        waypointsList.appendChild(pointItem);
    });
}

// Animation variables
let bounceOffset = 0;
let animationSpeed = 0.05;

function drawWaypoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines
    if (waypoints.length > 1) {
        ctx.setLineDash([5, 10]);
        ctx.strokeStyle = 'rgba(255, 255, 255, 255)';
        ctx.lineWidth = Math.max(2, window.innerWidth * 0.003); // Responsive line width
        
        ctx.beginPath();
        ctx.moveTo(waypoints[0].x, waypoints[0].z);
        for (let i = 1; i < waypoints.length; i++) {
            ctx.lineTo(waypoints[i].x, waypoints[i].z);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Draw waypoints
    waypoints.forEach((point, index) => {
        const size = Math.max(20, 100 * point.y); // Minimum size for better visibility
        const bounce = Math.sin(bounceOffset + index) * (window.innerHeight * 0.01);

        if (markerImage.fallback) {
            // Fallback circle drawing if image fails to load
            ctx.beginPath();
            ctx.arc(point.x, point.z + bounce, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
        } else {
            // Draw marker image
            ctx.drawImage(markerImage, point.x - size / 2, point.z - size / 2 + bounce, size, size);
        }

        // Draw point number
        ctx.font = `${Math.max(16, window.innerWidth * 0.015)}px Arial`;
        ctx.fillStyle = "white";
        ctx.fillText(index, point.x + size / 2, point.z - size / 2 + bounce);
    });

    updateWaypointList();
}

// Animation loop
function animate() {
    bounceOffset += animationSpeed;
    if (bounceOffset > Math.PI * 2) bounceOffset = 0;
    drawWaypoints();
    requestAnimationFrame(animate);
}

// Event Listeners
canvas.addEventListener('dblclick', (event) => {
    if (!isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * canvas.width;
        const z = (event.clientY - rect.top) / rect.height * canvas.height;
        const y = parseFloat(zoomInput.value);
        
        waypoints.push({ x, y, z });
        drawWaypoints();
    }
});

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) / rect.width * canvas.width;
    const mouseY = (event.clientY - rect.top) / rect.height * canvas.height;

    waypoints.forEach((point, index) => {
        const dist = Math.hypot(point.x - mouseX, point.z - mouseY);
        if (dist < dragRadius) {
            isDragging = true;
            selectedPointIndex = index;
            editingPointIndex = index;
            zoomInput.value = point.y;
        }
    });
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging && selectedPointIndex !== null) {
        const rect = canvas.getBoundingClientRect();
        const newX = (event.clientX - rect.left) / rect.width * canvas.width;
        const newZ = (event.clientY - rect.top) / rect.height * canvas.height;
        const initialPoint = waypoints[selectedPointIndex];
        const distance = Math.hypot(newX - initialPoint.x, newZ - initialPoint.z);

        if (distance < dragRadius) {
            waypoints[selectedPointIndex].x = newX;
            waypoints[selectedPointIndex].z = newZ;
            drawWaypoints();
        }
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    selectedPointIndex = null;
});

zoomInput.addEventListener('input', (event) => {
    if (editingPointIndex !== null) {
        waypoints[editingPointIndex].y = parseFloat(event.target.value);
        drawWaypoints();
    }
});

canvas.addEventListener('click', (event) => {
    if (!isDragging) {
        const rect = canvas.getBoundingClientRect();
        const clickX = (event.clientX - rect.left) / rect.width * canvas.width;
        const clickY = (event.clientY - rect.top) / rect.height * canvas.height;

        waypoints.forEach((point, index) => {
            const dist = Math.hypot(point.x - clickX, point.z - clickY);
            if (dist < 10 * point.y) {
                editingPointIndex = index;
                zoomInput.value = point.y;
            }
        });
    }
});

deleteLastPointBtn.addEventListener('click', () => {
    waypoints.pop();
    drawWaypoints();
});

// Handle window resize
window.addEventListener('resize', () => {
    updateScreenConstraints();
    drawWaypoints();
});

const socket = io.connect('http://localhost:3000');  // Adjust URL to Flask app’s IP/port

// Launch button functionality
launchBtn.addEventListener('click', () => {
    const servoAngles = waypoints.map(point => calculateServoAngles(point.x, point.y, point.z));
    
    // Emit each servo angle data to the SocketIO server
    servoAngles.forEach((angles, index) => {
        const angleData = {
            x: angles[0],
            y: angles[1],
            z: angles[2],
            c: 0 // Set claw angle if needed or modify as per actual logic
        };
        
        // Emit 'processed_frame' event with angle data
        socket.emit('processed_frame', angleData);
        console.log(`Sent waypoint ${index + 1} angles to server:`, angleData);
    });
});

// Start animation
animate();