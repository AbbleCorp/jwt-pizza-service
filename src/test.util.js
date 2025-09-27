const { Role, DB } = require('./database/database.js');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}


async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  const created = await DB.addUser(user);
  // return the created user plus the plaintext password so tests can log in
  return { ...created, password: 'toomanysecrets' };
}

module.exports = { randomName, createAdminUser };