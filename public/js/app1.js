// DOM Elements
const cameraFeed = document.getElementById('camera-feed');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const waypointsList = document.getElementById('waypoints-list');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.getElementById('zoom-value');
const deleteLastPointBtn = document.getElementById('delete-last-point');
const sidebar = document.getElementById('sidebar');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');

// Dynamic scaling configuration
let screenConfig = {
    wrist_x_min: 0,
    wrist_x_max: 0,
    wrist_y_min: 0.5,
    wrist_y_max: 3.0,
    palm_size_min: 5,
    palm_size_max: 0
};

// Servo angle limits
const SERVO_LIMITS = {
    x_min: 0,
    x_mid: 75,
    x_max: 150,
    y_min: 0,
    y_mid: 90,
    y_max: 180,
    z_min: 0,
    z_mid: 25,
    z_max: 50
};

// State management
let waypoints = [];
let isDragging = false;
let selectedPointIndex = null;
let editingPointIndex = null;
let bounceOffset = 0;
const animationSpeed = 0.05;
const dragRadius = 100;

// Initialize canvas and screen configuration
function initializeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Update screen configuration based on canvas size
    updateScreenConfig();
}

// Update screen configuration based on current dimensions
function updateScreenConfig() {
    screenConfig.wrist_x_max = canvas.width;
    screenConfig.palm_size_max = Math.min(canvas.width, canvas.height) / 2;
    screenConfig.wrist_x_min = 0;
    screenConfig.palm_size_min = 5;
}

// Utility functions
function mapRange(value, min1, max1, min2, max2) {
    return min2 + ((value - min1) * (max2 - min2)) / (max1 - min1);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// Calculate servo angles with dynamic scaling
function calculateServoAngles(x, y, z) {
    const servoAngle = [0, 0, 0];
    
    // Scale X based on screen width
    const scaledX = mapRange(x, 0, canvas.width, screenConfig.wrist_x_min, screenConfig.wrist_x_max);
    const clampedX = clamp(scaledX, screenConfig.wrist_x_min, screenConfig.wrist_x_max);
    servoAngle[0] = Math.round(mapRange(clampedX, screenConfig.wrist_x_min, screenConfig.wrist_x_max, SERVO_LIMITS.x_max, SERVO_LIMITS.x_min));
    
    // Scale Y based on input range
    const clampedY = clamp(y, screenConfig.wrist_y_min, screenConfig.wrist_y_max);
    servoAngle[1] = Math.round(mapRange(clampedY, screenConfig.wrist_y_min, screenConfig.wrist_y_max, SERVO_LIMITS.y_max, SERVO_LIMITS.y_min));
    
    // Scale Z based on screen height
    const scaledZ = mapRange(z, 0, canvas.height, screenConfig.palm_size_min, screenConfig.palm_size_max);
    const clampedZ = clamp(scaledZ, screenConfig.palm_size_min, screenConfig.palm_size_max);
    servoAngle[2] = 180 - Math.round(mapRange(clampedZ, screenConfig.palm_size_min, screenConfig.palm_size_max, SERVO_LIMITS.z_max, SERVO_LIMITS.z_min));
    
    return servoAngle;
}

// Update waypoints list in sidebar
function updateWaypointList() {
    waypointsList.innerHTML = '';
    waypoints.forEach((point, index) => {
        const servoAngles = calculateServoAngles(point.x, point.y, point.z);
        const pointItem = document.createElement('div');
        pointItem.className = 'point-item bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow';
        pointItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-medium text-gray-700">Point ${index + 1}</span>
                <span class="text-sm text-gray-500">
                    X: ${servoAngles[0]}°, Y: ${servoAngles[1]}°, Z: ${servoAngles[2]}°
                </span>
            </div>
        `;
        waypointsList.appendChild(pointItem);
    });
}

// Drawing functions
function drawWaypoints() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines
    if (waypoints.length > 1) {
        ctx.setLineDash([5, 10]);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 3;
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
        const size = 60 * point.y;
        const bounce = Math.sin(bounceOffset + index) * 5;

        // Draw point circle
        ctx.beginPath();
        ctx.arc(point.x, point.z + bounce, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${selectedPointIndex === index ? 0.8 : 0.6})`;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw point number
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(index + 1, point.x, point.z + bounce);
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

// Event handlers
canvas.addEventListener('dblclick', (event) => {
    if (!isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) * (canvas.width / rect.width);
        const z = (event.clientY - rect.top) * (canvas.height / rect.height);
        const y = parseFloat(zoomInput.value);
        
        waypoints.push({ x, y, z });
        drawWaypoints();
    }
});

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);

    waypoints.forEach((point, index) => {
        const dist = Math.hypot(point.x - mouseX, point.z - mouseY);
        if (dist < dragRadius) {
            isDragging = true;
            selectedPointIndex = index;
            editingPointIndex = index;
            zoomInput.value = point.y;
            zoomValue.textContent = point.y.toFixed(1);
        }
    });
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging && selectedPointIndex !== null) {
        const rect = canvas.getBoundingClientRect();
        const newX = (event.clientX - rect.left) * (canvas.width / rect.width);
        const newZ = (event.clientY - rect.top) * (canvas.height / rect.height);
        
        waypoints[selectedPointIndex].x = newX;
        waypoints[selectedPointIndex].z = newZ;
        drawWaypoints();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    selectedPointIndex = null;
});

zoomInput.addEventListener('input', (event) => {
    const value = parseFloat(event.target.value);
    zoomValue.textContent = value.toFixed(1);
    
    if (editingPointIndex !== null) {
        waypoints[editingPointIndex].y = value;
        drawWaypoints();
    }
});

deleteLastPointBtn.addEventListener('click', () => {
    waypoints.pop();
    drawWaypoints();
});

// Mobile sidebar toggle
toggleSidebarBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('sidebar-collapsed');
});

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        initializeCanvas();
        drawWaypoints();
    }, 250);
});

// Initialize camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        cameraFeed.srcObject = stream;
    })
    .catch((err) => {
        console.error("Camera error: ", err);
        // Fallback background if camera fails
        cameraFeed.style.backgroundColor = '#1a1a1a';
    });

// Launch button handler
const launchBtn = document.getElementById('launch-btn');
launchBtn.addEventListener('click', () => {
    const servoAnglesSequence = waypoints.map(point => 
        calculateServoAngles(point.x, point.y, point.z)
    );
    console.log('Launching sequence:', servoAnglesSequence);
    // Add your launch sequence implementation here
});

// Initialize the application
initializeCanvas();
animate();