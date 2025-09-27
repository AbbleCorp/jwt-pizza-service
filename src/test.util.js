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

async function addMenuItem() {
  let menuItem = { title: randomName(), price: 0.99, image: 'image.png', description: 'desc' };
  const res = await DB.addMenuItem(menuItem);
  return res;
}

module.exports = { randomName, createAdminUser, addMenuItem };