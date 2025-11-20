
// import { sleep, check, group, fail } from 'k6'
// import http from 'k6/http'
// import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

// export const options = {
//   cloud: {
//     distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
//     apm: [],
//   },
//   thresholds: {},
//   scenarios: {
//     login_order_verify: {
//       executor: 'ramping-vus',
//       gracefulStop: '30s',
//       stages: [
//         { target: 5, duration: '30s' },
//         { target: 15, duration: '1m' },
//         { target: 10, duration: '30s' },
//         { target: 0, duration: '30s' },
//       ],
//       gracefulRampDown: '30s',
//       exec: 'login_order_verify',
//     },
//   },
// }

// export function login_order_verify() {
//   let response

//   const vars = {}

//   // login
//   response = http.put(
//     'https://pizza-service.abblecorp.click/api/auth',
//     '{"email":"d@jwt.com","password":"diner"}',
//     {
//       headers: {
//         accept: '*/*',
//         'accept-encoding': 'gzip, deflate, br, zstd',
//         'accept-language': 'en-US,en;q=0.9',
//         'content-type': 'application/json',
//         origin: 'https://pizza.abblecorp.click',
//         priority: 'u=1, i',
//         'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//         'sec-ch-ua-mobile': '?0',
//         'sec-ch-ua-platform': '"Linux"',
//         'sec-fetch-dest': 'empty',
//         'sec-fetch-mode': 'cors',
//         'sec-fetch-site': 'same-site',
//       },
//     }
//   )

//   if (!check(response, { 'status equals 200': response => response.status.toString() === '200' })) {
//   console.log(response.body);
//   fail('Login was *not* 200');
//   }


//   vars['token'] = jsonpath.query(response.json(), '$.token')[0]

//   sleep(2)

//   // menu
//   response = http.get('https://pizza-service.abblecorp.click/api/order/menu', {
//     headers: {
//       accept: '*/*',
//       'accept-encoding': 'gzip, deflate, br, zstd',
//       'accept-language': 'en-US,en;q=0.9',
//       authorization: `Bearer ${vars['token']}`,
//       'content-type': 'application/json',
//       'if-none-match': 'W/"1fc-cgG/aqJmHhElGCplQPSmgl2Gwk0"',
//       origin: 'https://pizza.abblecorp.click',
//       priority: 'u=1, i',
//       'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-ch-ua-platform': '"Linux"',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-site',
//     },
//   })

//   // franchise
//   response = http.get(
//     'https://pizza-service.abblecorp.click/api/franchise?page=0&limit=20&name=*',
//     {
//       headers: {
//         accept: '*/*',
//         'accept-encoding': 'gzip, deflate, br, zstd',
//         'accept-language': 'en-US,en;q=0.9',
//         authorization: `Bearer ${vars['token']}`,
//         'content-type': 'application/json',
//         'if-none-match': 'W/"5c-UrU6FPurLC0JcnOrzddwdfUXFBA"',
//         origin: 'https://pizza.abblecorp.click',
//         priority: 'u=1, i',
//         'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//         'sec-ch-ua-mobile': '?0',
//         'sec-ch-ua-platform': '"Linux"',
//         'sec-fetch-dest': 'empty',
//         'sec-fetch-mode': 'cors',
//         'sec-fetch-site': 'same-site',
//       },
//     }
//   )
//   sleep(2)

//   // auth
//   response = http.get('https://pizza-service.abblecorp.click/api/user/me', {
//     headers: {
//       accept: '*/*',
//       'accept-encoding': 'gzip, deflate, br, zstd',
//       'accept-language': 'en-US,en;q=0.9',
//       authorization: `Bearer ${vars['token']}`,
//       'content-type': 'application/json',
//       'if-none-match': 'W/"5d-giPwT70hIHK+1ACFRM1hvMG//dU"',
//       origin: 'https://pizza.abblecorp.click',
//       priority: 'u=1, i',
//       'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-ch-ua-platform': '"Linux"',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-site',
//     },
//   })
//   sleep(1.6)

//   // order
//   response = http.post(
//     'https://pizza-service.abblecorp.click/api/order',
//     '{"items":[{"menuId":3,"description":"Margarita","price":0.0042},{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"1","franchiseId":1}',
//     {
//       headers: {
//         accept: '*/*',
//         'accept-encoding': 'gzip, deflate, br, zstd',
//         'accept-language': 'en-US,en;q=0.9',
//         authorization: `Bearer ${vars['token']}`,
//         'content-type': 'application/json',
//         origin: 'https://pizza.abblecorp.click',
//         priority: 'u=1, i',
//         'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//         'sec-ch-ua-mobile': '?0',
//         'sec-ch-ua-platform': '"Linux"',
//         'sec-fetch-dest': 'empty',
//         'sec-fetch-mode': 'cors',
//         'sec-fetch-site': 'same-site',
//       },
//     }
//   )

//   if (!check(response, { 'status equals 200': response => response.status.toString() === '200' })) {
//   console.log(response.body);
//   fail('Purchase was *not* 200');
//   }


//   vars['jwt'] = jsonpath.query(response.json(), '$.jwt')[0]


//   sleep(1.9)

//   // verify
//   response = http.post(
//     'https://pizza-factory.cs329.click/api/order/verify',
//     `{"jwt": "${vars['jwt']}"}`,
//     {
//       headers: {
//         accept: '*/*',
//         'accept-encoding': 'gzip, deflate, br, zstd',
//         'accept-language': 'en-US,en;q=0.9',
//         authorization: `Bearer ${vars['token']}`,
//         'content-type': 'application/json',
//         origin: 'https://pizza.abblecorp.click',
//         priority: 'u=1, i',
//         'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
//         'sec-ch-ua-mobile': '?0',
//         'sec-ch-ua-platform': '"Linux"',
//         'sec-fetch-dest': 'empty',
//         'sec-fetch-mode': 'cors',
//         'sec-fetch-site': 'cross-site',
//         'sec-fetch-storage-access': 'active',
//       },
//     }
//   )
// }
