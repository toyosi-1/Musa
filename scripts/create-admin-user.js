// This script creates an admin user in Firebase
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Get email and password from command line arguments
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if service account file exists
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('\x1b[31mError: service-account.json file not found!\x1b[0m');
  console.log('\nPlease follow these steps:');
  console.log('1. Go to Firebase console: https://console.firebase.google.com/');
  console.log('2. Select your project');
  console.log('3. Go to Project settings > Service accounts');
  console.log('4. Click "Generate new private key"');
  console.log('5. Save the file as "service-account.json" in the root directory of your project');
  process.exit(1);
}

// Initialize Firebase Admin with service account
const serviceAccount = require(serviceAccountPath);
const app = initializeApp({
  credential: require('firebase-admin').credential.cert(serviceAccount),
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 
               `https://${serviceAccount.project_id}.firebaseio.com`
});

console.log('\x1b[36m%s\x1b[0m', 'Firebase Admin initialized successfully');

// Create user function
async function createAdminUser(email, password, displayName) {
  try {
    // First check if user already exists
    const auth = getAuth();
    let userRecord;
    
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('\x1b[33m%s\x1b[0m', `User ${email} already exists. Updating to admin role...`);
    } catch (error) {
      // User doesn't exist, create new user
      console.log(`Creating new user with email: ${email}`);
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log('\x1b[32m%s\x1b[0m', `Created new user: ${email}`);
    }

    // Update user in Realtime Database
    const db = getDatabase();
    const userRef = db.ref(`users/${userRecord.uid}`);
    const timestamp = Date.now();
    
    // Update user data
    await userRef.update({
      uid: userRecord.uid,
      email: email,
      displayName: displayName,
      role: 'admin',
      status: 'approved',
      isEmailVerified: true,
      createdAt: timestamp,
      lastLogin: timestamp,
      approvedAt: timestamp
    });
    
    console.log('\x1b[32m%s\x1b[0m', 'Success! User has been granted admin privileges.');
    console.log('\x1b[36m%s\x1b[0m', `User ID: ${userRecord.uid}`);
    console.log('\nYou can now login to the application with:');
    console.log(`Email: ${email}`);
    console.log('Password: [your chosen password]');
    
    return userRecord.uid;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error creating admin user:');
    console.error(error);
    process.exit(1);
  }
}

// Get user input
console.log('\x1b[36m%s\x1b[0m', '=== Create Admin User for Musa App ===');
rl.question('Enter email for admin user: ', (email) => {
  rl.question('Enter password (min 8 characters): ', (password) => {
    rl.question('Enter display name: ', async (displayName) => {
      if (!email || !password || !displayName) {
        console.error('\x1b[31m%s\x1b[0m', 'All fields are required!');
        rl.close();
        process.exit(1);
      }
      
      if (password.length < 8) {
        console.error('\x1b[31m%s\x1b[0m', 'Password must be at least 8 characters!');
        rl.close();
        process.exit(1);
      }
      
      try {
        await createAdminUser(email, password, displayName);
        rl.close();
        process.exit(0);
      } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', 'Error:', error);
        rl.close();
        process.exit(1);
      }
    });
  });
});
