export { BaseRepository } from "./base.repository";
export { UserRepository } from "./user.repository";
export { PostRepository } from "./post.repository";
export { PostImageRepository } from "./postimage.repository";
export { LikeRepository } from "./like.repository";
export { CategoryRepository } from "./category.repository";
export { PaymentRepository } from "./payment.repository";
export { ViewRepository } from "./view.repository";
export { PricingTierRepository } from "./pricingtier.repository";

// Import classes for instantiation
import { UserRepository } from "./user.repository";
import { PostRepository } from "./post.repository";
import { PostImageRepository } from "./postimage.repository";
import { LikeRepository } from "./like.repository";
import { CategoryRepository } from "./category.repository";
import { PaymentRepository } from "./payment.repository";
import { ViewRepository } from "./view.repository";
import { PricingTierRepository } from "./pricingtier.repository";

// Singleton instances for easy import
export const userRepository = new UserRepository();
export const postRepository = new PostRepository();
export const postImageRepository = new PostImageRepository();
export const likeRepository = new LikeRepository();
export const categoryRepository = new CategoryRepository();
export const paymentRepository = new PaymentRepository();
export const viewRepository = new ViewRepository();
export const pricingTierRepository = new PricingTierRepository();
