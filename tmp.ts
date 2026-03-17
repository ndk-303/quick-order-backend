Table: {
  _id: ObjectId,
  name: string,
  capacity: number,
  restaurant: ObjectId,
  token: string,
  qrImage: string,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}

User: {
  "_id": ObjectId,

  "email": "string",
  "phoneNumber": "string",
  "password": "string",

  "googleId": "string",
  "facebookId": "string",

  "authProviders": ["phone", "google"],

  "fullName": "string",
  "address": "string",

  "role": "CLIENT | ADMIN | STAFF | ...",

  "refreshToken": "string",

  "isActive": false,

  "restaurantId": ObjectId,

  "verificationOtp": "string",
  "otpExpiry": Date,

  "createdAt": Date,
  "updatedAt": Date
}

restaurants: {
  "_id": ObjectId,

  "name": "Nhà hàng ABC",
  "address": "123 Lê Lợi, Q1",

  "location": {
    "type": "Point",
    "coordinates": [106.7009, 10.7769]
  },

  "allowedRadius": 50,

  "rating": 4.5,
  "review": 120,

  "priceRange": "$$",
  "imageUrl": "https://...",

  "type": ObjectId,

  "openTime": "08:00 - 22:00",

  "createdAt": Date,
  "updatedAt": Date
}

restauranttypes: {
  "_id": ObjectId,
  "name": "Cafe",
  "slug": "cafe",
  "imageUrl": "https://...",
  "createdAt": Date,
  "updatedAt": Date
}

restaurantreviews: {
  "_id": ObjectId,

  "userId": ObjectId,
  "restaurantId": ObjectId,

  "rating": 5,
  "comment": "Đồ ăn rất ngon",
  "images": ["https://..."],

  "createdAt": Date,
  "updatedAt": Date
}

favoriterestaurants: {
  "_id": ObjectId,
  "userId": ObjectId,
  "restaurantId": ObjectId,
  "createdAt": Date,
  "updatedAt": Date
}

orders: {
  "_id": ObjectId,

  "userId": ObjectId,
  "restaurantId": ObjectId,
  "tableId": ObjectId,

  "items": [
    {
      "menuItemId": ObjectId,
      "name": "Trà sữa",
      "price": 30000,
      "quantity": 2,
      "selectedOptions": [
        { "name": "Thêm trân châu", "price": 5000 }
      ],
      "note": "Ít đá",
      "status": "PENDING",
      "category": "DRINK"
    }
  ],

  "totalAmount": 70000,
  "status": "PENDING",
  "priorityScore": 0,

  "createdAt": Date,
  "updatedAt": Date
}

invoices: {
  "_id": ObjectId,

  "userId": ObjectId,
  "restaurantId": ObjectId,
  "tableId": ObjectId,

  "items": [
    {
      "menuItemId": ObjectId,
      "name": "Trà sữa",
      "price": 30000,
      "quantity": 2,
      "selectedOptions": [
        { "name": "Thêm trân châu", "price": 5000 }
      ],
      "note": "",
      "category": "DRINK"
    }
  ],

  "totalAmount": 70000,
  "status": "PAID",
  "paymentMethod": "MOMO",

  "createdAt": Date,
  "updatedAt": Date
}

menuitems: {
  "_id": ObjectId,

  "name": "Trà sữa truyền thống",
  "description": "Trà sữa đen truyền thống",
  "price": 30000,
  "imageUrl": "...",

  "restaurant": ObjectId,

  "isAvailable": true,

  "category": "DRINK",

  "options": [
    {
      "name": "Size",
      "isRequired": true,
      "options": [
        { "name": "M", "price": 0, "isActive": true },
        { "name": "L", "price": 5000, "isActive": true }
      ]
    },
    {
      "name": "Topping",
      "isRequired": false,
      "options": [
        { "name": "Trân châu", "price": 5000 },
        { "name": "Thạch", "price": 3000 }
      ]
    }
  ],

  "createdAt": Date,
  "updatedAt": Date
}