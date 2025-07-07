# Real-Time Chat Application

A modern, real-time chat application with AI integration built using Next.js, React, Firebase, Socket.IO, and OpenRouter API.

**⚠️ Note: This application is currently in development and may have incomplete features or ongoing improvements.**

## Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure login and registration with Firebase Authentication
- **AI Chat Assistant**: Integrated DeepSeek R1 AI model via OpenRouter API (pre-trained, not fine-tuned)
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and shadcn/ui
- **Dark/Light Mode**: Theme support for user preference
- **Persistent Data**: Messages and conversations stored in Firebase Firestore

## Tech Stack

### Frontend
- **Framework & Language**: React.js with Next.js 15, TypeScript
- **UI & State Management**: Tailwind CSS with shadcn/ui, Zustand (with Immer), React Query
- 
### Backend & Services
- **Framework**: Node.js/Express.js
- **Authentication**: Firebase
- **Database**: Firebase Cloud Firestore
- **Real-time Communication**: Socket.IO
- **AI Integration**: DeepSeek R1 API via OpenRouter (pre-trained model)
- **Planned AI Enhancements**: Vercel AI SDK, LangChain, RAG with embeddings

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn
- Firebase account
- OpenRouter API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/socket-chat-ui.git
   cd socket-chat-ui
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Firebase configuration and OpenRouter API keys

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Optional: Run the Socket.IO server for real-time features:
   ```bash
   npm run server:dev
   # or
   yarn server:dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## How to Use the Application

### Getting Started
1. **Sign Up/Login**: Create a new account or log in with existing credentials
2. **Access Chat Interface**: After authentication, you'll be redirected to the main chat interface

### Starting Conversations

#### Option 1: Chat with AI Assistant
- Click the **"New AI Chat"** button in the sidebar
- Start typing your message to interact with the AI assistant
- The AI will respond automatically to your questions and messages

#### Option 2: Chat with Other Users
1. Click the **"New Chat"** button in the sidebar
2. A **user search dialog** will appear
3. **Search for users** by:
   - Display name (e.g., "John Doe")
   - Email address (e.g., "john@example.com")
   - Start typing at least 2 characters to see search results
4. **Select a user** from the search results to start a new conversation
5. The conversation will appear in your sidebar, and you can start messaging

### Managing Conversations
- **View conversations**: All your active conversations appear in the left sidebar
- **Switch conversations**: Click on any conversation in the sidebar to switch to it
- **Message history**: Previous messages are automatically loaded when you open a conversation
- **Real-time updates**: New messages appear instantly without refreshing

### User Interface Features
- **Dark/Light mode**: Toggle between themes using the theme switcher
- **Mobile responsive**: The app works on both desktop and mobile devices
- **Typing indicators**: See when other users are typing (when Socket.IO server is running)
- **Message timestamps**: View when messages were sent
- **User status**: See online/offline status of other users

### Current Limitations & Known Issues

**⚠️ Development Status**: This application is actively being developed. Some features may be incomplete or subject to change.

- **User Discovery**: Currently, you need to know the exact name or email of users to find them
- **Group Chats**: Not yet implemented
- **File Sharing**: Not yet available
- **Message Reactions**: Not yet implemented
- **Push Notifications**: Not yet configured
- **Socket.IO Features**: Real-time features like typing indicators require the Socket.IO server to be running

### Testing the Application

Since this is a chat application, you'll need multiple users to fully test it:

1. **Create multiple test accounts** using different email addresses
2. **Open the app in multiple browser windows/tabs** (or use incognito mode)
3. **Log in with different accounts** in each window
4. **Search for and message between the accounts** to test the chat functionality

### Troubleshooting

#### Common Issues:
- **Can't find users**: Make sure you're typing the exact display name or email address
- **Messages not sending**: Check your Firebase configuration and internet connection
- **Real-time features not working**: Make sure the Socket.IO server is running on port 4000
- **Login issues**: Verify your Firebase Authentication settings

#### Debug Tips:
- Check the browser console for error messages
- Ensure Firebase rules allow read/write access for authenticated users
- Verify environment variables are correctly set

## Project Structure

```
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js app directory
│   │   ├── api/         # API routes
│   │   ├── auth/        # Authentication pages
│   │   ├── chat/        # Chat pages
│   │   ├── layout.tsx   # Root layout
│   │   └── page.tsx     # Home page
│   ├── components/      # React components
│   │   ├── auth/        # Authentication components
│   │   ├── chat/        # Chat interface components
│   │   ├── layout/      # Layout components
│   │   ├── shared/      # Shared components
│   │   └── ui/          # UI components (shadcn/ui)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility functions and services
│   │   ├── api/         # API services
│   │   ├── firebase/    # Firebase services
│   │   └── utils/       # Utility functions
│   ├── store/           # Zustand stores
│   └── types/           # TypeScript type definitions
├── server/              # Socket.IO server
├── .env.local.example   # Example environment variables
├── next.config.ts       # Next.js configuration
└── tailwind.config.ts   # Tailwind CSS configuration
```

## Development Roadmap

### Planned Features:
- [ ] Enhanced user discovery and friend requests
- [ ] Group chat functionality
- [ ] File and image sharing
- [ ] Message reactions and emoji support
- [ ] Push notifications
- [ ] Voice and video calling
- [ ] Message search functionality
- [ ] Chat themes and customization

### Planned AI Enhancements:
- [ ] **Vercel AI SDK Integration**: Enhanced AI streaming and function calling
- [ ] **LangChain Integration**: Advanced AI workflow orchestration
- [ ] **RAG (Retrieval-Augmented Generation)**: Context-aware AI responses using document embeddings
- [ ] **Vector Database**: Store and search message/document embeddings for intelligent context retrieval
- [ ] **Smart Summarization**: AI-powered conversation summaries
- [ ] **Semantic Search**: Find messages and conversations based on meaning, not just keywords
- [ ] **Model Fine-tuning**: Custom training on conversation data for domain-specific responses

### Current Focus:
- Improving real-time message delivery
- Enhancing user experience and UI polish
- Bug fixes and performance optimizations
- Planning AI architecture improvements

## Deployment

The application can be easily deployed to Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Set up the environment variables
4. Deploy!

## Firebase Setup

1. Create a new Firebase project
2. Enable Authentication (Email/Password and Google)
3. Set up Firestore database
4. Create the necessary security rules
5. Add your Firebase configuration to `.env.local`

## Socket.IO Server

For a complete real-time experience, you'll need to run the Socket.IO server:

```bash
# Development
npm run server:dev

# Production
npm run server:build
npm run server:start
```

The server runs on port 4000 by default and provides:
- Real-time message delivery
- Typing indicators
- User presence (online/offline status)
- Read receipts

## Contributing

This project is in active development. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Socket.IO](https://socket.io/)
- [OpenRouter](https://openrouter.ai/)
- [Vercel AI SDK](https://sdk.vercel.ai/) *(planned)*
- [LangChain](https://www.langchain.com/) *(planned)*
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
