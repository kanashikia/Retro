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
- **Styling**: Vanilla CSS with modern, responsive aesthetics
- **AI**: Google Generative AI (Gemini API)
- **Icons**: Lucide React

## 📸 Screenshots

<div align="center">
  <img src="assets/screen-1.png" width="45%" />
  <img src="assets/screen-2.png" width="45%" />
  <img src="assets/screen-3.png" width="45%" />
  <img src="assets/screen-4.png" width="45%" />
</div>

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
