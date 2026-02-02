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
- **Database**: MySQL with Sequelize ORM
- **Infrastructure**: Docker & Docker Compose
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
- Docker & Docker Compose (Recommended for Database)
- A Google Gemini API Key

### Installation

1. Clone the repository
2. Install dependencies for both frontend and backend:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   # AI Configuration
   GEMINI_API_KEY=your_api_key_here

   # Server Configuration
   PORT=3001
   JWT_SECRET=your_super_secret_key_here

   # Database Configuration (Docker defaults)
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=retro

   # Frontend Configuration
   VITE_SOCKET_URL=http://localhost:3001
   ```

### 🐳 Running with Docker (Recommended)

The easiest way to get everything running, including the MySQL database, is using Docker:

```bash
docker-compose up --build
```

The app will be available at `http://localhost:3000`.

### 🛠️ Manual Execution

If you prefer to run things manually:

1. **Start MySQL**: Ensure you have a MySQL server running and a database named `retro` created.
2. **Start the Sync Server** (Backend):
   ```bash
   npm run server
   ```
3. **Start the Frontend** (in a separate terminal):
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:3000`.

## 🔒 Security Note
This application uses a server-side proxy to communicate with the Gemini API. This ensures that your API keys are never exposed to the client-side bundle. Additionally, session updates are validated on the server to ensure only authorized admins can change the retro phase.

