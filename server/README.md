# Socket.IO Server for Real-Time Chat

This is a Socket.IO server implementation for the real-time chat application.

## Setup

1. Make sure you have Node.js installed (version 16 or later)
2. Install dependencies:
   ```
   npm install
   ```

## Running the Server

### Development Mode

To run the server in development mode with hot reloading:

```bash
npm run server:dev
```

### Production Mode

To build and run in production mode:

```bash
# Build the server
npm run server:build

# Start the server
npm run server:start
```

## Configuration

The server uses the following environment variables which can be set in `.env` file:

- `SOCKET_PORT`: The port on which the Socket.IO server will run (default: 4000)
- `NEXT_PUBLIC_APP_URL`: The URL of the client application (default: http://localhost:3000)

## How It Works

The Socket.IO server provides real-time features for the chat application:

1. User presence (online/offline status)
2. Real-time message delivery
3. Typing indicators
4. Read receipts and delivery confirmations

## API Endpoints

- `GET /health`: Health check endpoint that returns a 200 OK response with status information 