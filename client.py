import serial
import socketio  # Import SocketIO client
import time

debug = False


# Create a SocketIO client instance
sio = socketio.Client()
servo_data = [0,0,0,0]

# Connect to Flask App 1's SocketIO server
flask_app1_url = "http://192.168.1.58:3000"
sio.connect(flask_app1_url)

# Define event listeners for the SocketIO client
@sio.on('processed_frame')
def handle_processed_frame(data):
    try:
        if not debug:
            ser = serial.Serial('COM5', 115200)  # Automatically opens the serial port
        # Debugging: Print the incoming data structure to check keys
        print("Received data:", data)
        
        angles=data.split(",")
        
        # Check if all values are present
        if None in angles or len(angles)!=4:
            print("Warning: Missing data in processed_frame event.")
            return

        for i in range(4):
            servo_data[i]=int(angles[i])
        
        
        # Convert the angles to a serial byte array and send to the Arduino
        if not debug:
            ser.write(bytearray(servo_data))

        print(f"Sent to serial: {servo_data}")   
        time.sleep(1)
        ser.close() 
    except Exception as e:
        print(f"Error handling frame: {e}")

# Handle connection and disconnection events
@sio.event
def connect():
    print("SocketIO client connected to Flask App 1")

@sio.event
def disconnect():
    print("SocketIO client disconnected from Flask App 1")
    if not debug:
        if ser and ser.is_open:
            ser.close()  # Ensure the serial port is closed on exit

# Start the SocketIO client
if __name__ == '__main__':
    try:
        # Keep the program running to maintain the connection
        while True:
            time.sleep(1)  # Keep the main thread alive
    except KeyboardInterrupt:
        print("Program interrupted by user")
    finally:
        sio.disconnect()
        if ser and ser.is_open:
            ser.close()  # Ensure the serial port is closed on exit
