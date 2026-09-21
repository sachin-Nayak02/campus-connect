const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testNeonWrite() {
  console.log('=== Verifying Neon PostgreSQL Direct Writes ===');
  
  const testRoll = `TEST_${Date.now().toString().slice(-6)}`;
  const testEmail = `test_${Date.now()}@campusconnect.edu`;

  try {
    // 1. Write AllowedRollNumber
    console.log(`1. Creating test allowed roll number: ${testRoll}...`);
    const createdRoll = await prisma.allowedRollNumber.create({
      data: {
        rollNumber: testRoll,
        fullName: 'Neon DB Test Student',
        branch: 'Computer Science',
        year: '3rd Year',
        isUsed: false
      }
    });
    console.log('   ✅ Saved in Neon DB! ID:', createdRoll.id);

    // 2. Read it back
    console.log('2. Reading record back from Neon DB...');
    const readRoll = await prisma.allowedRollNumber.findUnique({
      where: { rollNumber: testRoll }
    });
    console.log('   ✅ Read successfully! Stored name:', readRoll.fullName);

    // 3. Update it
    console.log('3. Updating record in Neon DB...');
    const updatedRoll = await prisma.allowedRollNumber.update({
      where: { rollNumber: testRoll },
      data: { isUsed: true }
    });
    console.log('   ✅ Updated in Neon DB! isUsed =', updatedRoll.isUsed);

    // 4. Clean up test record
    await prisma.allowedRollNumber.delete({
      where: { rollNumber: testRoll }
    });
    console.log('   ✅ Cleaned up test record from Neon DB.');

    // 5. Total count of students currently in Neon DB
    const studentCount = await prisma.user.count();
    const whitelistCount = await prisma.allowedRollNumber.count();
    const postCount = await prisma.post.count();
    console.log(`\n=== Current Neon DB Live Totals ===`);
    console.log(`Total Users in Neon DB: ${studentCount}`);
    console.log(`Total Whitelisted Roll Numbers in Neon DB: ${whitelistCount}`);
    console.log(`Total Posts in Neon DB: ${postCount}`);
    console.log('==================================');
  } catch (err) {
    console.error('❌ Neon Write Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testNeonWrite();
