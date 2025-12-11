import { userRepository, postRepository, categoryRepository } from './dal/repositories';

async function testDAL() {
  console.log('Testing DAL implementation...\n');

  try {
    // Test 1: Get all categories
    console.log('1. Testing Category Repository:');
    const categories = await categoryRepository.getAllCategories();
    console.log(`   Found ${categories.length} categories`);

    // Test 2: Check if repositories are properly initialized
    console.log('\n2. Testing Repository Initialization:');
    console.log('   UserRepository:', userRepository.constructor.name);
    console.log('   PostRepository:', postRepository.constructor.name);
    console.log('   CategoryRepository:', categoryRepository.constructor.name);

    console.log('\n DAL is properly set up and working!');
  } catch (error) {
    console.error('\n Error testing DAL:', error);
  }
}

testDAL();
