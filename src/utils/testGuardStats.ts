/**
 * Testing utility for Guard Dashboard Statistics
 * This helps verify that guard verification data is being properly tracked and displayed
 */

import { logVerificationAttempt, getGuardActivityStats, getGuardVerificationHistory } from '@/services/guardActivityService';

/**
 * Generate sample verification data for testing
 */
export const generateSampleVerificationData = async (guardId: string, count: number = 10) => {
  console.log(`Generating ${count} sample verification records for guard: ${guardId}`);
  
  const sampleCodes = ['MUSA1234', 'MUSA5678', 'MUSA9012', 'INVALID123', 'EXPIRED456'];
  const sampleMessages = [
    'Access granted - valid code',
    'Access denied - code expired',
    'Access denied - invalid code',
    'Access denied - code not found',
    'Access granted - visitor access'
  ];
  
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const isValid = Math.random() > 0.3; // 70% success rate
    const code = sampleCodes[Math.floor(Math.random() * sampleCodes.length)];
    const message = isValid ? sampleMessages[0] : sampleMessages[Math.floor(Math.random() * (sampleMessages.length - 1)) + 1];
    
    // Vary timestamps over the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const timestamp = Date.now() - (daysAgo * 24 * 60 * 60 * 1000);
    
    try {
      const record = await logVerificationAttempt(guardId, {
        code,
        isValid,
        message,
        householdId: isValid ? `household-${Math.floor(Math.random() * 5) + 1}` : undefined,
        destinationAddress: isValid ? `Block ${Math.floor(Math.random() * 10) + 1}, Unit ${Math.floor(Math.random() * 20) + 1}` : undefined
      });
      
      // Manually set timestamp for testing (normally this would be set automatically)
      record.timestamp = timestamp;
      results.push(record);
      
      console.log(`Created sample record ${i + 1}/${count}:`, {
        code,
        isValid,
        message: message.substring(0, 30) + '...'
      });
      
    } catch (error) {
      console.error(`Failed to create sample record ${i + 1}:`, error);
    }
  }
  
  console.log(`Successfully generated ${results.length} sample verification records`);
  return results;
};

/**
 * Test and display current guard statistics
 */
export const testGuardStatistics = async (guardId: string) => {
  console.log('=== GUARD STATISTICS TEST ===');
  console.log('Guard ID:', guardId);
  
  try {
    // Get current statistics
    const stats = await getGuardActivityStats(guardId);
    console.log('Current Statistics:', {
      'Total Verifications': stats.totalVerifications,
      'Valid Access': stats.validAccess,
      'Denied Access': stats.deniedAccess,
      'Today Verifications': stats.todayVerifications,
      'Success Rate': `${stats.successRate}%`,
      'Expired Codes': stats.expiredCodes,
      'Invalid Codes': stats.invalidCodes,
      'This Week': stats.thisWeekVerifications,
      'This Month': stats.thisMonthVerifications,
      'Average Per Day': stats.averagePerDay
    });
    
    // Get verification history
    const history = await getGuardVerificationHistory(guardId, 5);
    console.log(`\nRecent Verification History (${history.length} records):`);
    
    history.forEach((record, index) => {
      const date = new Date(record.timestamp);
      console.log(`${index + 1}. ${record.code} - ${record.isValid ? 'GRANTED' : 'DENIED'} - ${date.toLocaleString()}`);
      if (record.message) {
        console.log(`   Message: ${record.message}`);
      }
      if (record.destinationAddress) {
        console.log(`   Destination: ${record.destinationAddress}`);
      }
    });
    
    return { stats, history };
    
  } catch (error) {
    console.error('Error testing guard statistics:', error);
    return null;
  }
};

/**
 * Clear all verification data for a guard (use with caution!)
 */
export const clearGuardData = async (guardId: string) => {
  console.warn('⚠️  CLEARING ALL GUARD DATA FOR:', guardId);
  console.warn('This action cannot be undone!');
  
  // Note: This would require additional Firebase admin functions to implement
  // For now, this is just a placeholder for the functionality
  console.log('Clear function not implemented - would require Firebase admin access');
};

/**
 * Quick test function to run from browser console
 */
export const quickTest = async (guardId: string) => {
  console.log('🧪 Running Quick Guard Statistics Test...');
  
  // Test current stats
  const result = await testGuardStatistics(guardId);
  
  if (result && result.stats.totalVerifications === 0) {
    console.log('📊 No verification data found. Generating sample data...');
    await generateSampleVerificationData(guardId, 15);
    
    // Test again after generating data
    console.log('📊 Testing statistics after generating sample data...');
    await testGuardStatistics(guardId);
  }
  
  console.log('✅ Quick test completed!');
};

// Export for browser console usage
if (typeof window !== 'undefined') {
  (window as any).testGuardStats = {
    test: testGuardStatistics,
    generate: generateSampleVerificationData,
    quickTest: quickTest
  };
  
  console.log('🔧 Guard Statistics Testing Tools Available:');
  console.log('- testGuardStats.test(guardId) - Test current statistics');
  console.log('- testGuardStats.generate(guardId, count) - Generate sample data');
  console.log('- testGuardStats.quickTest(guardId) - Run complete test');
}
