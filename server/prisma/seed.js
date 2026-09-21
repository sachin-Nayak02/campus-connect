const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CampusConnect database...');

  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const studentPasswordHash = await bcrypt.hash('Student@123', 10);

  // 1. Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@campusconnect.edu' },
    update: {},
    create: {
      rollNumber: 'ADMIN001',
      fullName: 'Campus Administrator',
      email: 'admin@campusconnect.edu',
      passwordHash: adminPasswordHash,
      branch: 'Administration',
      year: 'Staff',
      role: 'admin',
      status: 'active',
      bio: 'CampusConnect Head Administrator'
    }
  });
  console.log('Admin user seeded:', admin.email);

  // 2. Seed Whitelist Roll Numbers
  const whitelist = [
    { rollNumber: '21CS001', fullName: 'Aryan Sharma', branch: 'Computer Science', year: '3rd Year', isUsed: true },
    { rollNumber: '21CS002', fullName: 'Sneha Patel', branch: 'Computer Science', year: '3rd Year', isUsed: true },
    { rollNumber: '21EC015', fullName: 'Rohan Verma', branch: 'Electronics & Comm.', year: '3rd Year', isUsed: false },
    { rollNumber: '22ME042', fullName: 'Priya Nair', branch: 'Mechanical Eng.', year: '2nd Year', isUsed: false },
    { rollNumber: '23IT088', fullName: 'Vikram Singh', branch: 'Information Tech.', year: '1st Year', isUsed: false },
    { rollNumber: '21CS005', fullName: 'Ananya Gupta', branch: 'Computer Science', year: '3rd Year', isUsed: false },
    { rollNumber: '22EE019', fullName: 'Rahul Das', branch: 'Electrical Eng.', year: '2nd Year', isUsed: false }
  ];

  for (const item of whitelist) {
    await prisma.allowedRollNumber.upsert({
      where: { rollNumber: item.rollNumber },
      update: { isUsed: item.isUsed },
      create: {
        ...item,
        addedBy: admin.id
      }
    });
  }
  console.log(`Whitelisted ${whitelist.length} roll numbers.`);

  // 3. Seed 2 Demo Students
  const student1 = await prisma.user.upsert({
    where: { email: 'aryan.sharma@college.edu' },
    update: {},
    create: {
      rollNumber: '21CS001',
      fullName: 'Aryan Sharma',
      email: 'aryan.sharma@college.edu',
      passwordHash: studentPasswordHash,
      phone: '9876543210',
      branch: 'Computer Science',
      year: '3rd Year',
      gender: 'Male',
      bio: 'Coding enthusiast, tech club lead, coffee lover ☕💻',
      role: 'student',
      status: 'active'
    }
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'sneha.patel@college.edu' },
    update: {},
    create: {
      rollNumber: '21CS002',
      fullName: 'Sneha Patel',
      email: 'sneha.patel@college.edu',
      passwordHash: studentPasswordHash,
      phone: '9876543211',
      branch: 'Computer Science',
      year: '3rd Year',
      gender: 'Female',
      bio: 'Robotics enthusiast & badminton player 🏸🤖',
      role: 'student',
      status: 'active'
    }
  });
  console.log('Sample students seeded:', student1.email, student2.email);

  // 4. Seed Friendship between Aryan & Sneha
  await prisma.friendship.upsert({
    where: {
      requesterId_receiverId: {
        requesterId: student1.id,
        receiverId: student2.id
      }
    },
    update: { status: 'accepted' },
    create: {
      requesterId: student1.id,
      receiverId: student2.id,
      status: 'accepted'
    }
  });

  // 5. Seed Initial Posts
  const post1 = await prisma.post.create({
    data: {
      authorId: student1.id,
      content: '🚀 Excited to welcome everyone to CampusConnect! The annual College Hackathon registrations are officially open. Who wants to team up for the AI track?',
      likes: {
        create: [{ userId: student2.id }]
      },
      comments: {
        create: [
          {
            userId: student2.id,
            content: 'Count me in! Let’s build something incredible this weekend!'
          }
        ]
      }
    }
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: student2.id,
      content: 'Morning campus view from the Central Library 📚✨ Have a productive semester ahead everyone!',
      likes: {
        create: [{ userId: student1.id }]
      }
    }
  });

  console.log('Sample posts seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
