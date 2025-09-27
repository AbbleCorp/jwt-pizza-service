const request = require('supertest');
const app = require('../service');
const { createAdminUser, randomName, addMenuItem } = require('../test.util');

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
  //add a menu item to ensure there is at least one
  const menuItem = addMenuItem();
});


test('GET menu items', async () => {
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('description');
    expect(res.body[0]).toHaveProperty('price');
});

test('PUT menu item as admin', async () => {
    // Create admin and obtain token by logging in through the auth endpoint
    const admin = await createAdminUser();
    const loginRes = await request(app).put('/api/auth').send({ email: admin.email, password: admin.password });
    expect(loginRes.status).toBe(200);
    const adminAuthToken = loginRes.body.token;
    //get original menu array
    const originalMenuRes = await request(app).get('/api/order/menu');
    //add a new menu item
    const randomMenuName = randomName();
    const newItem = { title: randomMenuName, price: 0.99, image: 'image.png', description: 'desc' };
    const res = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminAuthToken}`)
        .send(newItem);
    //expect to see the new item in the returned menu, expect the array to be one larger
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const addedItem = res.body.find(item => item.title === randomMenuName);
    expect(addedItem).toBeDefined();
    expect(addedItem).toHaveProperty('id');
    expect(addedItem).toHaveProperty('description', newItem.description);
    expect(addedItem).toHaveProperty('price', newItem.price);
    expect(res.body.length).toBe(originalMenuRes.body.length + 1);
});


test('PUT menu item as non-admin', async () => {
    const newItem = { title: 'Student', price: 0.0001, image: 'pizza9.png', description: 'No topping, no sauce, just carbs' };
    const res = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newItem);
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ message: 'unable to add menu item' });
});


test('GET orders for authenticated user', async () => {
    const res = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('dinerId', registeredUser.id);
    expect(res.body).toHaveProperty('orders');
    expect(res.body).toHaveProperty('page');
    expect(res.body.orders).toBeInstanceOf(Array);
});


test('POST create order for authenticated user', async () => {
    //get menu to use for order items
    const menuRes = await request(app).get('/api/order/menu');
    const menu = menuRes.body;

    const newOrder = { franchiseId: 1, storeId: 1, items: [ { menuId: menu[0].id, description: menu[0].description, price: menu[0].price } ] };
    const res = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer ${testUserAuthToken}`)
        .send(newOrder);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('order');
    expect(res.body).toHaveProperty('jwt');
    expect(res.body.order).toHaveProperty('id');
    expect(res.body.order).toHaveProperty('franchiseId', newOrder.franchiseId);
    expect(res.body.order).toHaveProperty('storeId', newOrder.storeId);
    expect(res.body.order).toHaveProperty('items');
    expect(Array.isArray(res.body.order.items)).toBe(true);
    expect(res.body.order.items.length).toBe(1);
    expect(res.body.order.items[0]).toHaveProperty('menuId', newOrder.items[0].menuId);
});

test('POST create order with invalid authentication fails', async () => {
    const newOrder = { franchiseId: 1, storeId: 1, items: [ { menuId: 1, description: 'desc', price: 0.05 } ] };
    const res = await request(app)
        .post('/api/order')
        .set('Authorization', `Bearer invalidtoken`)
        .send(newOrder);
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: 'unauthorized' });
});