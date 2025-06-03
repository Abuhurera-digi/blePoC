import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

export const getDBConnection = async () => {
  return SQLite.openDatabase({ name: 'userDB.db', location: 'default' });
};

export const closeDBConnection = async (db) => {
  if (db) {
    await db.close();
  }
};
