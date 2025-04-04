# Real-Time Chat Application

A modern, real-time chat application with AI integration built using Next.js, React, Firebase, Socket.IO, and OpenRouter API.

## Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure login and registration with Firebase Authentication
- **AI Chat Assistant**: Integrated DeepSeek R1 AI model via OpenRouter API
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and shadcn/ui
- **Dark/Light Mode**: Theme support for user preference
- **Persistent Data**: Messages and conversations stored in Firebase Firestore

## Tech Stack

### Frontend
- **Framework**: React.js with Next.js 15
- **TypeScript**: For type safety and better developer experience
- **State Management**: Zustand with Immer for immutability
- **Styling**: Tailwind CSS with shadcn/ui components
- **Server State**: React Query for data fetching and caching
- **Forms**: React Hook Form with Zod validation

### Backend & Services
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Real-time Communication**: Socket.IO
- **AI Integration**: DeepSeek R1 API via OpenRouter

## Getting Started

### Prerequisites

- Node.js 18.0 or later
- npm or yarn
- Firebase account
- OpenRouter API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/real-time-chat.git
   cd real-time-chat
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

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

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
├── .env.local.example   # Example environment variables
├── next.config.ts       # Next.js configuration
└── tailwind.config.ts   # Tailwind CSS configuration
```

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

For a complete real-time experience, you'll need to implement or use a Socket.IO server. The client-side integration is already set up in this project.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Socket.IO](https://socket.io/)
- [OpenRouter](https://openrouter.ai/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
