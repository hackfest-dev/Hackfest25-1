# SpendX - Modern Financial Management Platform

## Overview
SpendX is a comprehensive financial management platform built with Next.js, designed to help users track expenses, manage budgets, and gain insights into their spending patterns. The platform supports multiple currencies and provides detailed analytics with a beautiful, modern UI.

## Tech Stack
- **Frontend Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI with Shadcn/ui
- **Database**: MongoDB
- **Authentication**: Firebase
- **APIs**:
  - Exchange Rate API for currency conversion
  - Gemini API for AI features
  - Cloudflare for CDN and edge functions

## Key Features
- 🔐 User Authentication & Management
- 📊 Interactive Dashboard
- 💰 Multi-currency Transaction Management
- 📈 Advanced Analytics
- 🌍 Location-based Tracking
- 🎨 Dark/Light Theme Support
- 📱 Responsive Design

## Getting Started

### Prerequisites
- Node.js (Latest LTS version)
- npm or yarn
- MongoDB account
- Firebase account
- Required API keys (see Environment Variables)

### Installation
1. Clone the repository
```bash
git clone https://github.com/hackfest-dev/Hackfest25-1.git
cd Hackfest25-1
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up environment variables
Create a `.env.local` file with the following variables:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
EXCHANGE_RATE_API_KEY=your_exchange_rate_api_key
MONGODB_URI=your_mongodb_uri
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

## Project Structure
- `/app` - Next.js app router pages and layouts
- `/components` - Reusable UI components
- `/lib` - Utility functions and shared logic
- `/hooks` - Custom React hooks
- `/models` - MongoDB schema models
- `/types` - TypeScript type definitions
- `/styles` - Global styles and Tailwind configuration
- `/context` - React context providers
- `/public` - Static assets

## Available Scripts
- `npm run dev` - Runs the development server with Turbopack
- `npm run build` - Builds the application for production
- `npm run start` - Starts the production server
- `npm run lint` - Runs ESLint for code quality

## Core Features

### Authentication & User Management
- User registration and login
- Profile management
- Session persistence
- Security features

### Dashboard
- Overview of financial metrics
- Real-time balance tracking
- Income vs Expenses visualization
- Currency conversion
- Date range filtering

### Transaction Management
- Add/Edit/Delete transactions
- Transaction categorization
- Multi-currency support
- Transaction history
- Location tracking

### Analytics
- Spending trends visualization
- Category-wise breakdown
- Historical data analysis
- Custom date range analysis

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Dependencies
Key dependencies include:
- `@radix-ui/*` - UI component primitives
- `firebase` - Authentication and real-time features
- `mongodb` & `mongoose` - Database management
- `react-hook-form` - Form handling
- `date-fns` - Date manipulation
- `recharts` - Data visualization
- `zod` - Schema validation

## License
This project is private and proprietary.

## Support
For support, please open an issue in the repository or contact the development team. 