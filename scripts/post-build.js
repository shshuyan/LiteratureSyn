#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📦 Running post-build optimizations...');

// Check build output
const buildDir = path.join(__dirname, '../.next');
if (fs.existsSync(buildDir)) {
  console.log('✅ Build directory exists');
  
  // Check for critical files
  const criticalFiles = [
    '.next/static',
    '.next/server',
    '.next/BUILD_ID'
  ];
  
  criticalFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.warn(`⚠️  ${file} missing`);
    }
  });
} else {
  console.error('❌ Build directory not found');
  process.exit(1);
}

console.log('✅ Post-build checks completed');
