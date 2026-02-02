# Retro - AI Agile Retrospective

**Retro** is a collaborative agile retrospective tool designed to make team feedback sessions seamless and intelligent. It leverages AI to handle the tedious parts of a retrospective, allowing teams to focus on what matters: improvement.

## 🚀 Key Features

- **Collaborative Brainstorming**: Participants join a shared session in real-time to submit feedback tickets.
- **✨ AI-Powered Grouping**: Integrated with **Google Gemini** to automatically categorize hundreds of tickets into logical themes in seconds.
- **Democratic Voting**: Team members vote on the most critical themes to ensure the most important topics get debated.
- **Structured Discussion**: A focused mode to walk through themes one by one, sorted by priority.
- **Seamless Joining**: No accounts required—admins create a session and share a link to let anyone join instantly.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript
- **Backend**: Node.js, Express, Socket.io
- **AI**: Google Generative AI (Gemini 2.5 Flash via Server Proxy)
- **Styling**: Vanilla CSS with modern aesthetics
- **Icons**: Lucide React

## 📸 Screenshots

<div align="center">
  <img src="assets/screen-1.png" width="45%" />
  <img src="assets/screen-2.png" width="45%" />
  <img src="assets/screen-3.png" width="45%" />
  <img src="assets/screen-4.png" width="45%" />
</div>

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   PORT=3001
   ```

### Running the App

You need to run both the sync server and the development frontend.

1. **Start the Sync Server** (Backend):
   ```bash
   npm run server
   ```

2. **Start the Frontend** (in a separate terminal):
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`.

## 🔒 Security Note
This application uses a server-side proxy to communicate with the Gemini API. This ensures that your API keys are never exposed to the client-side bundle. Additionally, session updates are validated on the server to ensure only authorized admins can change the retro phase.

