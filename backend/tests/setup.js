const db = require('../src/config/database');

function clearDatabase() {
  db.exec('DELETE FROM appointments');
  db.exec('DELETE FROM users');
  // Resetting autoincrement counters if the sequence table exists
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('appointments', 'users')");
  } catch {
    // sqlite_sequence doesn't exist until first INSERT with AUTOINCREMENT
  }
}

module.exports = { clearDatabase };
