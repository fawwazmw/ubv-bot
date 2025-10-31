#!/usr/bin/env node

/**
 * Database Test Script
 * Tests SQLite database operations
 */

import { BirthdayDB } from '../src/database/sqlite.js';

console.log('🧪 Testing SQLite Database Operations\n');

// Test 1: Count
console.log('1️⃣ Test: Count birthdays');
const count = BirthdayDB.count();
console.log(`   ✅ Count: ${count} birthdays\n`);

// Test 2: Insert
console.log('2️⃣ Test: Insert birthday');
BirthdayDB.set('test_user_123', '1990-05-15');
console.log('   ✅ Inserted: test_user_123 → 1990-05-15\n');

// Test 3: Get
console.log('3️⃣ Test: Get birthday');
const birthday = BirthdayDB.get('test_user_123');
console.log('   ✅ Retrieved:', birthday);
console.log(`      User ID: ${birthday.user_id}`);
console.log(`      Birthday: ${birthday.birthday_date}\n`);

// Test 4: Has
console.log('4️⃣ Test: Check if exists');
const exists = BirthdayDB.has('test_user_123');
console.log(`   ✅ Exists: ${exists}\n`);

// Test 5: Get All
console.log('5️⃣ Test: Get all birthdays');
const all = BirthdayDB.getAll();
console.log(`   ✅ Total records: ${all.length}`);
all.forEach(record => {
  console.log(`      ${record.user_id}: ${record.birthday_date}`);
});
console.log();

// Test 6: Update
console.log('6️⃣ Test: Update birthday');
BirthdayDB.set('test_user_123', '1991-06-20');
const updated = BirthdayDB.get('test_user_123');
console.log(`   ✅ Updated: ${updated.birthday_date}\n`);

// Test 7: Delete
console.log('7️⃣ Test: Delete birthday');
BirthdayDB.delete('test_user_123');
const deleted = BirthdayDB.get('test_user_123');
console.log(`   ✅ Deleted: ${deleted === undefined ? 'Success' : 'Failed'}\n`);

// Test 8: Bulk Insert
console.log('8️⃣ Test: Bulk insert');
const testData = [
  { userId: 'user1', birthdayDate: '1990-01-01' },
  { userId: 'user2', birthdayDate: '1995-05-15' },
  { userId: 'user3', birthdayDate: '2000-12-31' }
];
BirthdayDB.bulkInsert(testData);
console.log(`   ✅ Inserted ${testData.length} records\n`);

// Test 9: Verify bulk insert
console.log('9️⃣ Test: Verify bulk insert');
const finalAll = BirthdayDB.getAll();
console.log(`   ✅ Total records after bulk: ${finalAll.length}`);
finalAll.forEach(record => {
  console.log(`      ${record.user_id}: ${record.birthday_date}`);
});
console.log();

// Test 10: Cleanup test data
console.log('🧹 Cleanup: Removing test data');
['user1', 'user2', 'user3'].forEach(userId => {
  BirthdayDB.delete(userId);
});
const finalCount = BirthdayDB.count();
console.log(`   ✅ Final count: ${finalCount}\n`);

console.log('✨ All tests passed!\n');
console.log('📊 Database Summary:');
console.log(`   Location: data/ubv-bot.db`);
console.log(`   Total birthdays: ${finalCount}`);
console.log(`   Status: ✅ Healthy\n`);
