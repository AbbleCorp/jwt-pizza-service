const request = require('supertest');
const app = require('../service');
const { createAdminUser } = require('../test.util');


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

test('GET all franchises', async () => {
    const res = await request(app).get('/api/franchise')
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('franchises');
    expect(Array.isArray(res.body.franchises)).toBe(true);
    expect(res.body).toHaveProperty('more');
    expect(typeof res.body.more).toBe('boolean');
});

test('GET a user\'s franchises', async () => {
    const res = await request(app)
        .get(`/api/franchise/${registeredUser.id}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
        const franchise = res.body[0];
        expect(franchise).toHaveProperty('id');
        expect(franchise).toHaveProperty('name');
        expect(Array.isArray(franchise.admins)).toBe(true);
        expect(Array.isArray(franchise.stores)).toBe(true);
        expect(franchise.admins[0]).toHaveProperty('id', registeredUser.id);
        expect(franchise.admins[0]).toHaveProperty('name', registeredUser.name);
        expect(franchise.admins[0]).toHaveProperty('email', registeredUser.email);
    }
});

test('GET other user\'s franchises as admin', async () => {
    // Create admin and obtain token by logging in through the auth endpoint
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;

    const res = await request(app)
        .get(`/api/franchise/${testUser.id}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
        const franchise = res.body[0];
        expect(franchise).toHaveProperty('id');
        expect(franchise).toHaveProperty('name');
        expect(Array.isArray(franchise.admins)).toBe(true);
        expect(Array.isArray(franchise.stores)).toBe(true);
        expect(franchise.admins[0]).toHaveProperty('id', admin.id);
        expect(franchise.admins[0]).toHaveProperty('name', admin.name);
        expect(franchise.admins[0]).toHaveProperty('email', admin.email);
    }
});

test('GET franchise without auth returns 401', async () => {
    const res = await request(app).get(`/api/franchise/${registeredUser.id}`);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: 'unauthorized' });
});


test('POST create franchise', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: admin.email }] };
    const res = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newFranchise);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('name', newFranchise.name);
    expect(Array.isArray(res.body.admins)).toBe(true);
    expect(res.body.admins[0]).toHaveProperty('id', admin.id);
    expect(res.body.admins[0]).toHaveProperty('name', admin.name);
    expect(res.body.admins[0]).toHaveProperty('email', admin.email);
});

test('POST create franchise as non-admin returns 403', async () => {
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: registeredUser.email }] };
    const res = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newFranchise);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: 'unable to create a franchise' });
});

test('DELETE franchise as admin', async () => {
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: admin.email }] };
    const createRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newFranchise);
    expect(createRes.status).toBe(200);
    const franchiseId = createRes.body.id;

    const deleteRes = await request(app)
        .delete(`/api/franchise/${franchiseId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toMatchObject({ message: 'franchise deleted' });
});

test('POST create store as admin', async () => {
    //create admin user to use for creating franchise and store
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    //add a new franchise to add the store to
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: admin.email }] };
    const createRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newFranchise);
    expect(createRes.status).toBe(200);
    //add new store to the new franchise
    const franchiseId = createRes.body.id;
    const randomStoreName = Math.random().toString(36).substring(2, 15);
    const newStore = { name: randomStoreName};
    const storeRes = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newStore);
    //check the store was created correctly
    expect(storeRes.status).toBe(200);
    expect(storeRes.body).toHaveProperty('id');
    expect(storeRes.body).toHaveProperty('name', randomStoreName);
    expect(storeRes.body).toHaveProperty('franchiseId', franchiseId);

});

test('POST create store as non-admin returns 403', async () => {
    //add a new franchise to add the store to
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: admin.email }] };
    const createRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newFranchise);
    expect(createRes.status).toBe(200);
    //try to add new store to the new franchise as non-admin user
    const franchiseId = createRes.body.id;
    const randomStoreName = Math.random().toString(36).substring(2, 15);
    const newStore = { name: randomStoreName};
    const storeRes = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newStore);
    //check the store creation was rejected
    expect(storeRes.status).toBe(403);
    expect(storeRes.body).toMatchObject({ message: 'unable to create a store' });
});

test('DELETE store as admin', async () => {
    //create admin user to use for creating franchise and store
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    //add a new franchise to add the store to
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: admin.email }] };
    const createRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newFranchise);
    expect(createRes.status).toBe(200);
    //add new store to the new franchise
    const franchiseId = createRes.body.id;
    const randomStoreName = Math.random().toString(36).substring(2, 15);
    const newStore = { name: randomStoreName};
    const storeRes = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newStore);
    expect(storeRes.status).toBe(200);
    const storeId = storeRes.body.id;
    //delete the new store
    const deleteRes = await request(app)
        .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
        .set('Authorization', `Bearer ${adminAuthToken}`);
    //check the store was deleted correctly
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toMatchObject({ message: 'store deleted' });
});


test('DELETE store as non-admin returns 403', async () => {
    //add a new franchise to add the store to
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    const randomFranchiseName = Math.random().toString(36).substring(2, 15);
    const newFranchise = { name: randomFranchiseName, admins: [{ email: admin.email }] };
    const createRes = await request(app)
        .post('/api/franchise')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newFranchise);
    expect(createRes.status).toBe(200);
    //add new store to the new franchise
    const franchiseId = createRes.body.id;
    const randomStoreName = Math.random().toString(36).substring(2, 15);
    const newStore = { name: randomStoreName};
    const storeRes = await request(app)
        .post(`/api/franchise/${franchiseId}/store`)
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newStore);
    expect(storeRes.status).toBe(200);
    const storeId = storeRes.body.id;
    //try to delete the new store as non-admin user
    const deleteRes = await request(app)
        .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
        .set('Authorization', `Bearer ${testUserAuthToken}`);
    //check the store deletion was rejected
    expect(deleteRes.status).toBe(403);
    expect(deleteRes.body).toMatchObject({ message: 'unable to delete a store' });
});