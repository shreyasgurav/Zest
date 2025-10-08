#!/usr/bin/env node

/**
 * Security Testing Script
 * Run this script to validate all security fixes are working correctly
 * 
 * Usage: node scripts/test-security.js
 */

const path = require('path');
const fs = require('fs');

// Set up the environment to load our TypeScript modules
require('ts-node/register');

async function runSecurityTests() {
  console.log('🔒 Zest Booking Platform - Security Validation\n');
  console.log('=' * 50);
  
  try {
    // Import our security test helpers
    const testHelpers = require('../src/utils/securityTestHelpers');
    
    // Run all security tests
    const results = await testHelpers.runAllSecurityTests();
    
    // Generate audit report
    console.log('\n📋 Generating security audit report...');
    const auditReport = await testHelpers.generateSecurityAuditReport();
    
    // Save audit report to file
    const reportPath = path.join(__dirname, '..', 'security-audit-report.md');
    fs.writeFileSync(reportPath, auditReport);
    console.log(`✅ Security audit report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error running security tests:', error);
    console.error('\nThis might be due to missing dependencies or configuration issues.');
    console.error('Please ensure:');
    console.error('1. All dependencies are installed (npm install)');
    console.error('2. Firebase configuration is set up');
    console.error('3. Environment variables are configured');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔒 Security Testing Script

Usage:
  node scripts/test-security.js [options]

Options:
  --help, -h     Show this help message
  --report-only  Generate report without running tests
  --verbose      Show detailed test output

Description:
  This script validates that all security fixes implemented in the
  booking system are working correctly. It tests:
  
  • Cryptographically secure ticket number generation
  • Comprehensive booking data validation
  • Duplicate payment detection capabilities
  • Security event logging functionality
  
  A detailed audit report will be generated and saved as 
  'security-audit-report.md' in the project root.

Exit Codes:
  0  All security tests passed
  1  One or more security tests failed or error occurred
`);
  process.exit(0);
}

if (args.includes('--report-only')) {
  console.log('📋 Generating security audit report only...\n');
  // This would generate a report based on previous test results
  // For now, we'll just run the full tests
}

// Run the security tests
runSecurityTests(); 