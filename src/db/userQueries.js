export const createUserTable = async (db) => {
    const query = `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER
    );`;
    await db.executeSql(query);
  };
  
  export const insertUser = async (db, name, age) => {
    const insertQuery = `INSERT INTO users (name, age) VALUES (?, ?);`;
    await db.executeSql(insertQuery, [name, age]);
  };
  
  export const getUsers = async (db) => {
    const results = await db.executeSql(`SELECT * FROM users;`);
    return results[0].rows.raw();
  };
  
  export const deleteUser = async (db, id) => {
    await db.executeSql(`DELETE FROM users WHERE id = ?;`, [id]);
  };
  