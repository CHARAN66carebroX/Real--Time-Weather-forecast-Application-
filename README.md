# Real-Time Weather Forecast Application

A modern, real-time weather forecast app built with Next.js 15 and the OpenWeatherMap API. Search any city to get current conditions and a 5-day forecast, complete with animated weather icons and a responsive design.

## Features

- Current weather conditions (temperature, humidity, wind speed, feels-like)
- 5-day weather forecast
- City search with debounced input
- Geolocation support to detect your current location
- Animated weather icons powered by Lottie
- Responsive layout with Tailwind CSS
- Temperature unit toggle (°C / °F)
- Error handling for invalid cities and network failures

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or higher
- npm (comes with Node.js) or yarn

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/weather-forecast-app.git
cd weather-forecast-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

### 4. Obtain an OpenWeatherMap API key

1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Create a free account (or sign in)
3. Navigate to **API keys** in your account dashboard
4. Copy your default key or generate a new one

### 5. Add the API key to `.env.local`

Open `.env.local` and replace the placeholder with your actual key:

```
OPENWEATHERMAP_API_KEY=your_actual_key
```

### 6. Run the development server

```bash
npm run dev
```

### 7. Open the app

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Running Tests

```bash
npm test
```

## Tech Stack

| Technology | Version |
|---|---|
| [Next.js](https://nextjs.org/) | 15 |
| [React](https://react.dev/) | 19 |
| [TypeScript](https://www.typescriptlang.org/) | 5 |
| [Tailwind CSS](https://tailwindcss.com/) | 3 |
| [lottie-react](https://github.com/LottieFiles/lottie-react) | 2 |
| [OpenWeatherMap API](https://openweathermap.org/api) | — |
