let scene, camera, renderer;
let points = [];
let coordinatesDisplay = document.getElementById('coordinates');

const init = () => {
  // Initialize scene, camera, and renderer
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add a camera feed as background
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    video.onloadeddata = () => {
      const videoTexture = new THREE.VideoTexture(video);
      scene.background = videoTexture;
    };
  });

  // Initialize the Y-axis slider
  const ySlider = document.getElementById('y-slider');
  ySlider.addEventListener('input', updateYCoordinate);

  // Handle canvas clicks to add points
  renderer.domElement.addEventListener('click', addPoint);

  // Delete the last point
  document.getElementById('delete-point').addEventListener('click', deleteLastPoint);

  // Set initial camera position
  camera.position.z = 5;

  animate();
};

const addPoint = (event) => {
  // Calculate X, Z coordinates relative to canvas
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const z = -(event.clientY / window.innerHeight) * 2 + 1;
  const y = parseFloat(document.getElementById('y-slider').value);

  // Create a sphere to represent the point
  const geometry = new THREE.SphereGeometry(0.05, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const point = new THREE.Mesh(geometry, material);

  // Position the point
  point.position.set(x * 5, y, z * 5);
  scene.add(point);
  points.push(point);

  // Update coordinates display
  updateCoordinatesDisplay();
  
  // Draw dotted line if more than one point
  if (points.length > 1) {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points.map(p => p.position));
    const lineMaterial = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.1, gapSize: 0.05 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    scene.add(line);
  }
};

const updateYCoordinate = () => {
  if (points.length > 0) {
    const latestPoint = points[points.length - 1];
    const y = parseFloat(document.getElementById('y-slider').value);
    latestPoint.position.y = y;
    updateCoordinatesDisplay();
  }
};

const deleteLastPoint = () => {
  if (points.length > 0) {
    const point = points.pop();
    scene.remove(point);
    updateCoordinatesDisplay();
  }
};

const updateCoordinatesDisplay = () => {
  const coords = points.map(p => `(${p.position.x.toFixed(2)}, ${p.position.y.toFixed(2)}, ${p.position.z.toFixed(2)})`);
  coordinatesDisplay.textContent = `Coordinates: [${coords.join(', ')}]`;
};

const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

// Initialize the 3D environment
init();
