const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let registeredUser;

beforeAll(async () => {
  // create a fresh test user
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  registeredUser = registerRes.body.user;
  expect(testUserAuthToken).toMatch(/^[\w-]*\.[\w-]*\.[\w-]*$/); // quick jwt-ish check
});

test('GET /api/user/me returns authenticated user (no password)', async () => {
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(res.status).toBe(200);

  // basic user shape checks
  expect(res.body).toHaveProperty('id');
  expect(res.body).toHaveProperty('name', testUser.name);
  expect(res.body).toHaveProperty('email', registeredUser.email);

  // sensitive fields should not be returned
  expect(res.body).not.toHaveProperty('password');

  // roles should be present and be an array
  expect(Array.isArray(res.body.roles)).toBe(true);
  expect(res.body.roles.length).toBeGreaterThan(0);
  expect(res.body.roles[0]).toHaveProperty('role');
});

test('GET /api/user/me without token returns 401', async () => {
  const res = await request(app).get('/api/user/me');
  expect(res.status).toBe(401);
  expect(res.body).toMatchObject({ message: 'unauthorized' });
});

const { Role, DB } = require('../database/database.js');

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

//TODO move to a test utility file if needed elsewhere

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  const created = await DB.addUser(user);
  // return the created user plus the plaintext password so tests can log in
  return { ...created, password: 'toomanysecrets' };
}

test('PUT /api/user/:userId updates user', async () => {
  const newName = 'new name';
  const newEmail = 'newemail@test.com';
  const newPassword = 'newpassword';

  // Create admin and obtain token by logging in through the auth endpoint
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
  expect(loginRes.status).toBe(200);
  const userAuthToken = loginRes.body.token;

  // Update the previously-registered user created in beforeAll
  const res = await request(app)
    .put(`/api/user/${registeredUser.id}`)
    .set('Authorization', `Bearer ${userAuthToken}`)
    .send({ name: newName, email: newEmail, password: newPassword });

  expect(res.status).toBe(200);
  // res.body should include the updated user object
  expect(res.body).toHaveProperty('user');
  expect(res.body.user).toHaveProperty('name', newName);
  expect(res.body.user).toHaveProperty('email', newEmail);

  // Old password (the original testUser.password) should no longer work for the updated user
  const oldLoginRes = await request(app).put('/api/auth').send({ email: newEmail, password: testUser.password });
  expect(oldLoginRes.status).not.toBe(200);

  // New password should allow login for the updated user
  const newLoginRes = await request(app).put('/api/auth').send({ email: newEmail, password: newPassword });
  expect(newLoginRes.status).toBe(200);
  expect(newLoginRes.body).toHaveProperty('token');
  expect(newLoginRes.body.user).toHaveProperty('email', newEmail);
});


//TODO: add test for unauthorized update attempt (non-admin trying to update another user)