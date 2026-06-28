# Zentora

Zentora is a modern retail intelligence platform that helps businesses manage inventory, sales, customers, analytics, and invoices from a single dashboard. The application provides a clean and responsive interface designed for efficient retail operations.

---

## Features

- Dashboard with business overview
- Inventory Management
- Sales & POS
- Customer Management
- Invoice Scanner
- Analytics Dashboard
- Smart Copilot Assistant
- Multi-language Support
- Firebase Integration
- Responsive UI
- Razorpay Payment Integration

---

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Motion
- Recharts

### Backend
- Node.js
- Express.js

### Database & Services
- Firebase

### Payment
- Razorpay

---

## Project Structure

```
.
├── src/
│   ├── components/
│   ├── utils/
│   ├── firebase.ts
│   ├── App.tsx
│   └── main.tsx
├── assets/
├── server.ts
├── package.json
└── vite.config.ts
```

---

## Installation

Clone the repository

```bash
git clone <repository-url>
```

Move into the project folder

```bash
cd zentora
```

Install dependencies

```bash
npm install
```

---

## Environment Variables

Create a `.env` file in the project root.

Example:

```env
GEMINI_API_KEY=your_api_key
```

Add any Firebase configuration values if required.

---

## Run Development Server

```bash
npm run dev
```

The application will start in development mode.

---

## Build for Production

```bash
npm run build
```

---

## Start Production Server

```bash
npm start
```

---

## Available Scripts

| Command | Description |
|----------|-------------|
| npm install | Install dependencies |
| npm run dev | Start development server |
| npm run build | Build production files |
| npm start | Start production server |
| npm run lint | TypeScript type checking |

---

## Modules

- Dashboard
- Inventory
- Sales POS
- Customers
- Invoice Scanner
- Analytics
- Settings
- Smart Copilot

---

## Requirements

- Node.js 18+
- npm
- Internet connection for API-based features

---

## License

This project is intended for educational and development purposes.
