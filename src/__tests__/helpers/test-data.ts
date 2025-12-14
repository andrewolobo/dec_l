import { faker } from "@faker-js/faker";

export const createMockUser = (overrides: any = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  email: faker.internet.email(),
  phoneNumber: faker.phone.number(),
  fullName: faker.person.fullName(),
  passwordHash: "$2b$12$mockHashedPassword",
  paymentsNumber: faker.phone.number(),
  oauthProvider: null,
  oauthProviderId: null,
  profilePictureUrl: faker.image.avatar(),
  location: faker.location.city(),
  bio: null,
  isEmailVerified: false,
  isPhoneVerified: false,
  isActive: true,
  isAdmin: false,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const createMockPost = (
  userId: number,
  categoryId: number,
  overrides: any = {}
) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  userId,
  categoryId,
  title: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseFloat(faker.commerce.price()),
  location: faker.location.city(),
  contactNumber: faker.phone.number(),
  brand: faker.company.name(),
  status: "Draft",
  emailAddress: faker.internet.email(),
  deliveryMethod: "Private Pickup",
  gpsLocation: null,
  scheduledPublishTime: null,
  publishedAt: null,
  expiresAt: null,
  viewCount: 0,
  likeCount: 0,
  tier: null,
  instagramPostId: null,
  instagramPostedAt: null,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  images: [],
  likes: [],
  views: [],
  ...overrides,
});

export const createMockCategory = (overrides: any = {}) => ({
  id: faker.number.int({ min: 1, max: 100 }),
  name: faker.commerce.department(),
  description: faker.commerce.productDescription(),
  createdAt: faker.date.past(),
  ...overrides,
});

export const createMockLike = (
  userId: number,
  postId: number,
  overrides: any = {}
) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  userId,
  postId,
  createdAt: faker.date.recent(),
  ...overrides,
});

export const createMockPostImage = (postId: number, overrides: any = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  postId,
  imageUrl: faker.image.url(),
  displayOrder: 0,
  createdAt: faker.date.recent(),
  ...overrides,
});

export const createMockView = (
  userId: number,
  postId: number,
  overrides: any = {}
) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  userId,
  postId,
  createdAt: faker.date.recent(),
  ...overrides,
});

export const createMockPayment = (
  userId: number,
  postId: number,
  overrides: any = {}
) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  userId,
  postId,
  amount: parseFloat(faker.commerce.price()),
  currency: "UGX",
  paymentMethod: "MobileMoney",
  transactionReference: faker.string.alphanumeric(16),
  status: "Pending",
  confirmedAt: null,
  createdAt: faker.date.recent(),
  ...overrides,
});
