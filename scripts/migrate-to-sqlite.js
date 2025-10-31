#!/usr/bin/env node

/**
 * Migration Script: JSON to SQLite
 *
 * This script migrates birthday data from JSON file to SQLite database
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BirthdayDB } from '../src/database/sqlite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JSON_FILE = join(__dirname, '../data/birthdays.json');

async function migrate() {
  console.log('🔄 Starting migration from JSON to SQLite...\n');

  // Check if JSON file exists
  if (!existsSync(JSON_FILE)) {
    console.log('⚠️  No JSON file found at:', JSON_FILE);
    console.log('✅ This is OK - starting with empty database\n');
    console.log('📊 Current database stats:');
    console.log(`   Total birthdays: ${BirthdayDB.count()}`);
    return;
  }

  try {
    // Read JSON file
    console.log('📖 Reading JSON file:', JSON_FILE);
    const jsonContent = readFileSync(JSON_FILE, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    const userIds = Object.keys(jsonData);
    console.log(`   Found ${userIds.length} birthday records\n`);

    if (userIds.length === 0) {
      console.log('✅ No data to migrate\n');
      return;
    }

    // Prepare data for bulk insert
    const birthdays = [];
    for (const [userId, value] of Object.entries(jsonData)) {
      if (value && value.date) {
        birthdays.push({
          userId: userId,
          birthdayDate: value.date
        });
        console.log(`   → User ${userId}: ${value.date}`);
      }
    }

    // Bulk insert to SQLite
    console.log(`\n💾 Inserting ${birthdays.length} records into SQLite...`);
    BirthdayDB.bulkInsert(birthdays);

    console.log('✅ Migration completed successfully!\n');

    // Verify migration
    console.log('🔍 Verifying migration...');
    const dbCount = BirthdayDB.count();
    console.log(`   Database now contains: ${dbCount} records`);

    if (dbCount === birthdays.length) {
      console.log('✅ Verification passed!\n');
    } else {
      console.log('⚠️  Warning: Record count mismatch!');
      console.log(`   Expected: ${birthdays.length}, Got: ${dbCount}\n`);
    }

    // Show sample records
    console.log('📊 Sample records from database:');
    const allRecords = BirthdayDB.getAll();
    allRecords.slice(0, 5).forEach(record => {
      console.log(`   ${record.user_id}: ${record.birthday_date}`);
    });

    if (allRecords.length > 5) {
      console.log(`   ... and ${allRecords.length - 5} more`);
    }

    console.log('\n✨ Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test bot commands to ensure everything works');
    console.log('   2. Keep birthdays.json as backup for a while');
    console.log('   3. After confirming everything works, you can delete birthdays.json');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
migrate().catch(console.error);
