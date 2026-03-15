export type SeedSubCategory = {
  name: string;
};

export type SeedCategory = {
  name: string;
  subCategories: SeedSubCategory[];
};

export const MARKETPLACE_CATEGORIES: SeedCategory[] = [
  {
    name: 'Fashion',
    subCategories: [
      { name: 'Men\'s Clothing' },
      { name: 'Women\'s Clothing' },
      { name: 'Kids\' Clothing' },
      { name: 'Shoes' },
      { name: 'Bags' },
      { name: 'Watches' },
      { name: 'Jewelry' },
      { name: 'Sportswear' },
      { name: 'Traditional Wear' },
      { name: 'Underwear & Lingerie' },
    ],
  },
  {
    name: 'Electronics',
    subCategories: [
      { name: 'Mobile Phones' },
      { name: 'Laptops' },
      { name: 'Tablets' },
      { name: 'Televisions' },
      { name: 'Audio & Headphones' },
      { name: 'Cameras' },
      { name: 'Gaming Consoles' },
      { name: 'Computer Accessories' },
      { name: 'Phone Accessories' },
      { name: 'Smart Home Devices' },
    ],
  },
  {
    name: 'Home & Kitchen',
    subCategories: [
      { name: 'Furniture' },
      { name: 'Cookware & Bakeware' },
      { name: 'Kitchen Appliances' },
      { name: 'Storage & Organization' },
      { name: 'Bedding' },
      { name: 'Home Decor' },
      { name: 'Cleaning Supplies' },
      { name: 'Lighting' },
    ],
  },
  {
    name: 'Health & Beauty',
    subCategories: [
      { name: 'Skincare' },
      { name: 'Hair Care' },
      { name: 'Makeup' },
      { name: 'Fragrances' },
      { name: 'Personal Care' },
      { name: 'Wellness & Supplements' },
      { name: 'Men\'s Grooming' },
    ],
  },
  {
    name: 'Groceries & Food',
    subCategories: [
      { name: 'Fresh Food' },
      { name: 'Packaged Foods' },
      { name: 'Drinks & Beverages' },
      { name: 'Snacks' },
      { name: 'Breakfast Foods' },
      { name: 'Grains & Staples' },
      { name: 'Spices & Condiments' },
    ],
  },
  {
    name: 'Baby, Kids & Toys',
    subCategories: [
      { name: 'Baby Essentials' },
      { name: 'Diapers & Wipes' },
      { name: 'Kids\' Clothing' },
      { name: 'Kids\' Shoes' },
      { name: 'Toys & Games' },
      { name: 'Books for Kids' },
      { name: 'Educational Toys' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    subCategories: [
      { name: 'Fitness Equipment' },
      { name: 'Sportswear' },
      { name: 'Outdoor Gear' },
      { name: 'Cycling' },
      { name: 'Team Sports' },
      { name: 'Camping & Hiking' },
    ],
  },
  {
    name: 'Automotive',
    subCategories: [
      { name: 'Car Accessories' },
      { name: 'Motorcycle Accessories' },
      { name: 'Oils & Fluids' },
      { name: 'Car Care' },
      { name: 'Tyres & Wheels' },
    ],
  },
  {
    name: 'Books & Stationery',
    subCategories: [
      { name: 'Fiction' },
      { name: 'Non-Fiction' },
      { name: 'Religious & Inspirational' },
      { name: 'Educational & Academic' },
      { name: 'Children\'s Books' },
      { name: 'Notebooks & Journals' },
      { name: 'Office Supplies' },
      { name: 'Art & Craft Supplies' },
    ],
  },
  {
    name: 'Accessories',
    subCategories: [
      { name: 'Belts' },
      { name: 'Hats & Caps' },
      { name: 'Wallets & Purses' },
      { name: 'Sunglasses' },
      { name: 'Scarves & Shawls' },
      { name: 'Fashion Jewelry' },
    ],
  },
  {
    name: 'Others',
    subCategories: [
      { name: 'Gifts & Souvenirs' },
      { name: 'Handmade & Crafts' },
      { name: 'Services' },
      { name: 'Miscellaneous' },
    ],
  },
];

