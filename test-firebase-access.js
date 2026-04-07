// Quick Firebase Access Test
// Run with: node test-firebase-access.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "YOUR_DATABASE_URL" // Replace with your database URL from .env.local
});

const db = admin.database();

async function testAccess() {
  console.log('Testing Firebase access...\n');

  try {
    // Test 1: Read all users
    console.log('1. Reading users...');
    const usersSnapshot = await db.ref('users').once('value');
    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      const userList = Object.entries(users);
      console.log(`✅ Found ${userList.length} users`);
      
      // Show user details
      userList.forEach(([uid, user]) => {
        console.log(`   - ${user.email} (${user.role}) - Status: ${user.status}`);
      });
    } else {
      console.log('❌ No users found in database');
    }

    // Test 2: Read estates
    console.log('\n2. Reading estates...');
    const estatesSnapshot = await db.ref('estates').once('value');
    if (estatesSnapshot.exists()) {
      const estates = estatesSnapshot.val();
      console.log(`✅ Found ${Object.keys(estates).length} estates`);
      Object.entries(estates).forEach(([id, estate]) => {
        console.log(`   - ${estate.name}`);
      });
    } else {
      console.log('❌ No estates found');
    }

    // Test 3: Read households
    console.log('\n3. Reading households...');
    const householdsSnapshot = await db.ref('households').once('value');
    if (householdsSnapshot.exists()) {
      const households = householdsSnapshot.val();
      console.log(`✅ Found ${Object.keys(households).length} households`);
    } else {
      console.log('⚠️  No households found (this is normal for new setup)');
    }

    // Test 4: Read access codes
    console.log('\n4. Reading access codes...');
    const codesSnapshot = await db.ref('accessCodes').once('value');
    if (codesSnapshot.exists()) {
      const codes = codesSnapshot.val();
      console.log(`✅ Found ${Object.keys(codes).length} access codes`);
    } else {
      console.log('⚠️  No access codes found (this is normal for new setup)');
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nIf you see users with status "pending", they should appear in the admin dashboard.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('This suggests the Firebase Admin SDK cannot access the database.');
  }

  process.exit(0);
}

testAccess();
