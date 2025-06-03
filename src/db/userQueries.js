export const createUserTable = async (db) => {
  const query = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    device_id TEXT NOT NULL
  );`;
  await db.executeSql(query);
};
  
export const insertUser = async (db, name, age, deviceId) => {
  const insertQuery = `INSERT INTO users (name, age, device_id) VALUES (?, ?, ?);`;
  await db.executeSql(insertQuery, [name, age, deviceId]);
};

  
export const getUsers = async (db, deviceId) => {
  console.log("Getting users for deviceId:", deviceId);
  const results = await db.executeSql(
    `SELECT * FROM users WHERE device_id = ?;`,
    [deviceId]
  );
  const users = results[0].rows.raw();
  console.log("Users fetched:", users);
  return users;
};
  
  export const deleteUser = async (db, id) => {
    const deleteQuery = `DELETE FROM users WHERE id = ?;`;
    await db.executeSql(deleteQuery, [id]);
  };
  
  