const fs = require('fs');
const path = require('path');

// Files to update with their new import paths
const filesToUpdate = [
  {
    path: 'src/services/accessCodeService.ts',
    oldImport: "import { getFirebaseDatabase } from '@/lib/firebase';",
    newImport: "import { getFirebaseDatabase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/services/guardActivityService.ts',
    oldImport: "import { getFirebaseDatabase } from '@/lib/firebase';",
    newImport: "import { getFirebaseDatabase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/services/userService.ts',
    oldImport: "import { getFirebaseDatabase } from '@/lib/firebase';",
    newImport: "import { getFirebaseDatabase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/services/guestCommunicationService.ts',
    oldImport: "import { getFirebaseDatabase } from '@/lib/firebase';",
    newImport: "import { getFirebaseDatabase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/services/householdService.ts',
    oldImport: "import { getFirebaseDatabase } from '@/lib/firebase';",
    newImport: "import { getFirebaseDatabase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/components/debug/FirebaseTest.tsx',
    oldImport: "import { getFirebaseAuth, getFirebaseDatabase, isFirebaseReady, waitForFirebase } from '@/lib/firebase';",
    newImport: "import { getFirebaseAuth, getFirebaseDatabase, isFirebaseReady, waitForFirebase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/app/debug/page.tsx',
    oldImport: "import { initializeFirebase, isFirebaseReady } from '@/lib/firebase';",
    newImport: "import { initializeFirebase, isFirebaseReady } from '@/lib/firebase-new';"
  },
  {
    path: 'src/contexts/AuthContext.tsx',
    oldImport: "import { getFirebaseAuth, getFirebaseDatabase, waitForFirebase } from '@/lib/firebase';",
    newImport: "import { getFirebaseAuth, getFirebaseDatabase, waitForFirebase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/components/resident/ResidentDashboard.tsx',
    oldImport: "import { getFirebaseDatabase } from '@/lib/firebase';",
    newImport: "import { getFirebaseDatabase } from '@/lib/firebase-new';"
  },
  {
    path: 'src/components/auth/AuthForm.tsx',
    oldImport: "import { isFirebaseReady, waitForFirebase } from '@/lib/firebase';",
    newImport: "import { isFirebaseReady, waitForFirebase } from '@/lib/firebase-new';"
  }
];

// Update each file
filesToUpdate.forEach(fileInfo => {
  const filePath = path.join(process.cwd(), fileInfo.path);
  
  try {
    // Read the file
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Update the import
    const updatedContent = content.replace(fileInfo.oldImport, fileInfo.newImport);
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    
    console.log(`✅ Updated ${fileInfo.path}`);
  } catch (error) {
    console.error(`❌ Error updating ${fileInfo.path}:`, error.message);
  }
});

console.log('\n🔥 Firebase imports update complete!');
