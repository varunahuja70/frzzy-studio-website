# FRZZY Studio Website

Premium digital production, brand design, motion, and visual studio website built with Next.js, React, Tailwind CSS, and TypeScript.

## Features

- **Editorial Studio Experience**: Ultra-smooth physics strands canvas, interactive lightning arcs, magnetic navigation, and curated portfolio reels.
- **Enterprise Vault & Admin Dashboard**: Linear-grade dark theme admin panel for client inquiries, task management, team roles, and lead exports.
- **Bank-Grade Security**: Argon2id password hashing, time-based one-time password (TOTP) 2FA with instant ephemeral QR reveal, CSRF defense, and rate limiting.
- **Responsive & Accessible**: Pixel-perfect design across mobile (375px), tablet (768px), desktop (1280px), and ultrawide (1920px).

## Getting Started

### Prerequisites

- Node.js 18+ or 20+
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/varunahuja70/frzzy-studio-website.git
   cd frzzy-studio-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS & Lucide Icons
- **Animation**: Physics Canvas, Smooth Spring Transitions, Framer Motion
- **Database**: SQLite with Drizzle ORM
- **Authentication**: Argon2id, TOTP 2FA, Signed HTTP-Only Cookies
