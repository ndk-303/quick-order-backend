import axios from 'axios';

const res = [
  {
    name: 'Bún Bò Huế O Xuân',
    address:
      '135 Nguyễn Thái Học, Phường Phạm Ngũ Lão, Quận 1, TP. Hồ Chí Minh',
    coordinates: [106.69398, 10.76743],
    rating: 4.4,
    review: 215,
    priceRange: "$$",
  },
  {
    name: "Phở Lệ",
    address: "413–415 Nguyễn Trãi, Phường 7, Quận 5, TP. Hồ Chí Minh",
    coordinates: [106.67021, 10.75432],
    rating: 4.6,
    review: 540,
    priceRange: "$",
  },
  {
    name: "Cơm Tấm Ba Ghiền",
    address: "84 Đặng Văn Ngữ, Phường 10, Quận Phú Nhuận, TP. Hồ Chí Minh",
    coordinates: [106.67852, 10.79918],
    rating: 4.7,
    review: 980,
    priceRange: "$$",
  },
  {
    name: "Pizza 4P’s Hai Bà Trưng",
    address: "151B Hai Bà Trưng, Phường 6, Quận 3, TP. Hồ Chí Minh",
    coordinates: [106.69483, 10.78662],
    rating: 4.5,
    review: 1320,
    priceRange: "$$$",
  },
  {
    name: "Chay Garden",
    address: "52 Võ Văn Tần, Phường 6, Quận 3, TP. Hồ Chí Minh",
    coordinates: [106.68944, 10.78291],
    rating: 4.3,
    review: 310,
    priceRange: "$$",
  },
];

async function seedRestaurants() {
  try {
    await Promise.all(
      res.map((restaurant) =>
        axios.post("http://localhost:5050/api/restaurants", restaurant)
      )
    );

    console.log("Seed restaurants thành công");
  } catch (error) {
    console.error("Lỗi khi seed restaurants:", error.response?.data || error);
  }
}

seedRestaurants();
