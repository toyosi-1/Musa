# Musa - Estate Access Control System

Musa is a modern, privacy-focused estate access control web application designed to replace manual security checks with a seamless digital solution.

## Key Features

### For Residents
- Generate private QR codes and text codes (e.g., "MUSA123") for estate access
- Share codes via WhatsApp, text message, or copy to clipboard
- Set expiration times for temporary access
- Manage your own household with family members
- Full privacy: no one, including the family head, can see your codes

### For Guards
- Scan QR codes using device camera
- Enter access codes manually
- Instant verification (green for valid, red for invalid)
- Privacy-focused design: guards verify codes without knowing who they belong to

## Technology Stack

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Authentication & Database**: Firebase (Authentication, Realtime Database)
- **QR Code**: QR code generation and scanning capabilities

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Setup Instructions

1. **Clone the repository:**
   ```
   git clone https://github.com/toyosi-1/Musa.git
   cd musa-app
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Set up Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Create a Realtime Database
   - Set database rules (see `database.rules.json` for reference)
   - Get your Firebase config from Project Settings

4. **Configure environment variables:**
   - Copy `sample.env.local` to `.env.local`
   - Update with your Firebase configuration values

5. **Run the development server:**
   ```
   npm run dev
   ```

6. **Open your browser:**
   - Go to http://localhost:3000

## Project Structure

```
musa-app/
├── src/
│   ├── app/                 # Next.js app router
│   ├── components/          # React components
│   │   ├── auth/            # Authentication components
│   │   ├── guard/           # Guard mode components
│   │   └── resident/        # Resident mode components
│   ├── contexts/            # React contexts
│   ├── lib/                 # Library code (Firebase setup)
│   ├── services/            # Business logic services
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── .env.local               # Environment variables (not committed)
└── ...                      # Configuration files
```

## Firebase Database Structure

```
musa-app-db/
├── users/                   # User profiles
│   └── [userId]/            # User data
├── households/              # Household data
│   └── [householdId]/       # Household details and members
├── accessCodes/             # Access codes data
│   └── [codeId]/            # Individual access code details
├── accessCodesByCode/       # Index for quick code lookups
├── accessCodesByUser/       # Index for user's codes
├── accessCodesByHousehold/  # Index for household's codes
├── householdInvites/        # Invitations to join households
└── invitesByEmail/          # Index for looking up invites by email
```

## Deployment

For production deployment:

1. Build the application:
   ```
   npm run build
   ```

2. Deploy to your preferred hosting platform:
   - [Vercel](https://vercel.com/) (recommended for Next.js)
   - [Netlify](https://www.netlify.com/)
   - [Firebase Hosting](https://firebase.google.com/docs/hosting)

## Future Plans (V2)

- Mobile app versions for iOS and Android
- Advanced analytics for estate management
- Integration with physical access control systems
- Guest pre-registration system

## License

This project is licensed under the MIT License - see the LICENSE file for details.
