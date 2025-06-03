import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { getDBConnection } from '../db/database';
import {
  createUserTable,
  insertUser,
  getUsers,
  deleteUser,
} from '../db/userQueries';

const DataScreen = () => {
  const [userList, setUserList] = useState([]);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [db, setDb] = useState(null);

  useEffect(() => {
    const initDB = async () => {
      const database = await getDBConnection();
      setDb(database);
      await createUserTable(database);
      const users = await getUsers(database);
      setUserList(users);
    };
    initDB();
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || !amount.trim()) return;

    await insertUser(db, name, parseFloat(amount));
    const updatedUsers = await getUsers(db);
    setUserList(updatedUsers);
    setName('');
    setAmount('');
  };

  const handleDelete = async (id) => {
    await deleteUser(db, id);
    const updatedUsers = await getUsers(db);
    setUserList(updatedUsers);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Add User</Text>

      <TextInput
        placeholder="Name"
        style={styles.input}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        placeholder="Amount"
        style={styles.input}
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <Button title="Submit" onPress={handleSubmit} />

      <Text style={styles.header}>User List</Text>
      <FlatList
        data={userList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text style={styles.userText}>
              {item.id}. {item.name}, Amount: ₹{item.age}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.emoji}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  header: { fontSize: 20, marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  userText: {
    fontSize: 16,
  },
  emoji: {
    fontSize: 20,
  },
});

export default DataScreen;