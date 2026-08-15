const fs = require('fs');
const path = require('path');
const storage = require('./storage/local-disk');

// Test file for storage functionality - matching existing test.js pattern

let testsPassed = 0;
let testsFailed = 0;
let totalTests = 0;

function assert(condition, testNumber, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ Test ${testNumber}: ${testName}`);
    testsPassed++;
  } else {
    console.log(`❌ Test ${testNumber}: ${testName}`);
  }
}

async function runStorageTests() {
  console.log('==========================================');
  console.log('  Storage Module Validation Tests');
  console.log('==========================================\n');

  try {
    // Test 1: Put and get file
    const testContent = 'Hello, Storage World!';
    const key = 'test-file.txt';
    
    const returnedKey = storage.put(key, Buffer.from(testContent));
    assert(returnedKey === key, 1, 'Storage put returns correct key');
    
    const retrievedContent = storage.get(key);
    assert(retrievedContent.toString() === testContent, 2, 'Storage get retrieves correct content');

    // Test 2: URL generation
    const url = storage.url(key);
    assert(url === `/media/${key}`, 3, 'Storage URL generation works correctly');

    // Test 3: File deletion
    const deleteKey = 'delete-test.txt';
    storage.put(deleteKey, Buffer.from('content to delete'));
    
    let existsBefore = storage.get(deleteKey);
    assert(existsBefore !== null, 4, 'File exists before deletion');
    
    storage.delete(deleteKey);
    
    let existsAfter = storage.get(deleteKey);
    assert(existsAfter === null, 5, 'File is deleted successfully');

    // Test 4: Non-existent file handling
    const nonExistentKey = 'non-existent-file.txt';
    const nonExistentContent = storage.get(nonExistentKey);
    assert(nonExistentContent === null, 6, 'Non-existent file returns null');

    // Test 5: Nested directory structure - using a simpler approach to avoid directory creation issues
    const nestedKey = 'nested/file.txt';
    const nestedContent = 'Nested file content';
    
    const returnedNestedKey = storage.put(nestedKey, Buffer.from(nestedContent));
    assert(returnedNestedKey === nestedKey, 7, 'Nested key is returned correctly');
    
    const retrievedNestedContent = storage.get(nestedKey);
    assert(retrievedNestedContent.toString() === nestedContent, 8, 'Nested file content retrieved correctly');

    // Test 6: File size checking
    const sizeKey = 'size-test.txt';
    const sizeContent = 'Test content for size checking';
    
    storage.put(sizeKey, Buffer.from(sizeContent));
    const size = await storage.getSize(sizeKey);
    assert(size === sizeContent.length, 9, 'File size is calculated correctly');

    // Test 7: Empty file handling
    const emptyKey = 'empty-file.txt';
    const returnedEmptyKey = storage.put(emptyKey, Buffer.from(''));
    assert(returnedEmptyKey === emptyKey, 10, 'Empty file key returned correctly');
    
    const retrievedEmptyContent = storage.get(emptyKey);
    assert(retrievedEmptyContent.toString() === '', 11, 'Empty file content retrieved correctly');

    // Test 8: List files in directory
    const listDir = 'list-test';
    const listKey1 = `${listDir}/file1.txt`;
    const listKey2 = `${listDir}/file2.txt`;
    
    storage.put(listKey1, Buffer.from('content1'));
    storage.put(listKey2, Buffer.from('content2'));
    
    const files = await storage.list(listDir);
    assert(files.includes('file1.txt'), 12, 'List includes first file');
    assert(files.includes('file2.txt'), 13, 'List includes second file');

    // Test 9: Non-existent directory listing
    const nonExistentFiles = await storage.list('non-existent-dir');
    assert(Array.isArray(nonExistentFiles) && nonExistentFiles.length === 0, 14, 'Non-existent directory returns empty array');

    console.log('\n==========================================');
    console.log(`  Storage Results: ${testsPassed}/${totalTests} passed, ${testsFailed} failed`);
    console.log('==========================================');

  } catch (error) {
    console.error('Storage test error:', error);
    process.exit(1);
  }
}

// Run the storage tests
runStorageTests().catch(err => {
  console.error('Storage test suite error:', err);
  process.exit(1);
});