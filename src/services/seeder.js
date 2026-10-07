import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Gym } from '../models/Gym.js';
import { Plan } from '../models/Plan.js';
import { Trainer } from '../models/Trainer.js';
import { Equipment } from '../models/Equipment.js';
import { Member } from '../models/Member.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { Attendance } from '../models/Attendance.js';

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ironman_gym';
    await mongoose.connect(mongoUri);
    console.log('[Seeder] Connected to MongoDB');

    // 1. Seed or update SuperAdmin
    const superAdminEmail = process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@ironman.com';
    const superAdminPassword = process.env.DEFAULT_SUPERADMIN_PASSWORD || 'Admin@123456';

    let superAdmin = await User.findOne({ email: superAdminEmail });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: 'Iron Man SuperAdmin',
        email: superAdminEmail,
        password: superAdminPassword,
        role: 'superadmin',
        phone: '+92 300 0000000',
      });
      console.log(`[Seeder] Created SuperAdmin: ${superAdminEmail}`);
    } else {
      console.log(`[Seeder] SuperAdmin already exists: ${superAdminEmail}`);
    }

    // 2. Seed Default Demo Gym
    let demoGym = await Gym.findOne({ slug: 'ironman-flagship' });
    if (!demoGym) {
      demoGym = await Gym.create({
        name: 'Iron Man Hardcore Fitness',
        slug: 'ironman-flagship',
        branchCode: 'GYM-001',
        address: 'Main Boulevard, Gulberg III, Lahore',
        phone: '+92 321 1234567',
        email: 'lahore@ironmangym.com',
        subscriptionPlan: 'pro',
        subscriptionStatus: 'active',
        mrrAmount: 5000,
        currency: 'PKR',
        settings: {
          taxRate: 0,
          allowPartialPayments: true,
          freezeFee: 500,
          gracePeriodDays: 3,
        },
      });
      console.log(`[Seeder] Created Flagship Gym: ${demoGym.name}`);
    }

    // 3. Seed Gym Owner & Staff with explicit gymId
    let gymOwner = await User.findOne({ email: 'owner@ironman.com' });
    if (!gymOwner) {
      gymOwner = await User.create({
        name: 'Tariq Butt',
        email: 'owner@ironman.com',
        password: 'Password@123',
        role: 'owner',
        gymId: demoGym._id,
        phone: '+92 321 9876543',
      });
      console.log(`[Seeder] Created Gym Owner: owner@ironman.com`);
    } else {
      gymOwner.gymId = demoGym._id;
      await gymOwner.save();
      console.log(`[Seeder] Updated Gym Owner gymId: owner@ironman.com`);
    }

    let receptionist = await User.findOne({ email: 'frontdesk@ironman.com' });
    if (!receptionist) {
      receptionist = await User.create({
        name: 'Ali Raza',
        email: 'frontdesk@ironman.com',
        password: 'Password@123',
        role: 'receptionist',
        gymId: demoGym._id,
        phone: '+92 333 1122334',
      });
      console.log(`[Seeder] Created Receptionist: frontdesk@ironman.com`);
    } else {
      receptionist.gymId = demoGym._id;
      await receptionist.save();
      console.log(`[Seeder] Updated Receptionist gymId: frontdesk@ironman.com`);
    }

    // 4. Seed Membership Plans
    const existingPlans = await Plan.countDocuments({ gymId: demoGym._id });
    if (existingPlans === 0) {
      await Plan.create([
        {
          gymId: demoGym._id,
          name: 'Day Pass',
          planType: 'daypass',
          durationDays: 1,
          price: 500,
          features: ['Full gym floor access', 'Locker access', 'Valid for 1 day'],
        },
        {
          gymId: demoGym._id,
          name: 'Monthly Standard',
          planType: 'monthly',
          durationDays: 30,
          price: 5000,
          features: ['Cardio & Strength floor', 'Standard locker', 'Steam bath 2x/month'],
        },
        {
          gymId: demoGym._id,
          name: 'Quarterly Beast',
          planType: 'quarterly',
          durationDays: 90,
          price: 13500,
          features: ['All access', 'Diet plan consultation', 'Free shaker bottle'],
        },
        {
          gymId: demoGym._id,
          name: 'Personal Training VIP',
          planType: 'pt',
          durationDays: 30,
          price: 18000,
          features: ['Dedicated certified coach', 'Custom meal plans', 'Body scan every 2 weeks'],
        },
      ]);
      console.log('[Seeder] Seeded default membership plans');
    }

    // 5. Seed Trainers
    const existingTrainers = await Trainer.countDocuments({ gymId: demoGym._id });
    if (existingTrainers === 0) {
      await Trainer.create([
        {
          gymId: demoGym._id,
          name: 'Hamza Malik',
          phone: '+92 301 5550101',
          email: 'hamza@ironmangym.com',
          specialty: 'Heavy Hypertrophy & Powerlifting',
          salary: 45000,
          experienceYears: 6,
        },
        {
          gymId: demoGym._id,
          name: 'Sara Khan',
          phone: '+92 302 5550102',
          email: 'sara@ironmangym.com',
          specialty: 'CrossFit & Women Strength Coaching',
          salary: 40000,
          experienceYears: 4,
        },
      ]);
      console.log('[Seeder] Seeded trainers');
    }

    // 6. Seed Equipment
    const existingEquipment = await Equipment.countDocuments({ gymId: demoGym._id });
    if (existingEquipment === 0) {
      await Equipment.create([
        { gymId: demoGym._id, name: 'Olympic Bench Press Rack', category: 'free_weights', status: 'working', quantity: 3, cost: 240000 },
        { gymId: demoGym._id, name: 'Commercial Treadmill Pro-X', category: 'cardio', status: 'working', quantity: 4, cost: 680000 },
        { gymId: demoGym._id, name: 'Cable Crossover 8-Stack', category: 'cable_machines', status: 'maintenance', quantity: 1, cost: 450000 },
        { gymId: demoGym._id, name: 'Leg Press 45 Degree', category: 'strength', status: 'working', quantity: 2, cost: 320000 },
      ]);
      console.log('[Seeder] Seeded equipment catalog');
    }

    // 7. Seed Sample Members & Payments
    const existingMembers = await Member.countDocuments({ gymId: demoGym._id });
    if (existingMembers === 0) {
      const now = new Date();
      const m1 = await Member.create({
        gymId: demoGym._id,
        memberId: 'M-1001',
        name: 'Usman Chaudhry',
        phone: '03001234567',
        cnic: '35202-1234567-1',
        plan: 'monthly',
        startDate: now,
        expiryDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
        status: 'active',
        totalAmount: 5000,
        paidAmount: 5000,
        dueAmount: 0,
      });

      const m2 = await Member.create({
        gymId: demoGym._id,
        memberId: 'M-1002',
        name: 'Bilal Ahmed',
        phone: '03217654321',
        cnic: '35201-7654321-3',
        plan: 'quarterly',
        startDate: now,
        expiryDate: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000),
        status: 'due',
        totalAmount: 13500,
        paidAmount: 8500,
        dueAmount: 5000,
      });

      const m3 = await Member.create({
        gymId: demoGym._id,
        memberId: 'M-1003',
        name: 'Farhan Zaidi',
        phone: '03339988776',
        cnic: '35200-9988776-5',
        plan: 'monthly',
        startDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
        expiryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        status: 'expired',
        totalAmount: 5000,
        paidAmount: 5000,
        dueAmount: 0,
      });

      // Payments
      await Payment.create([
        {
          gymId: demoGym._id,
          memberId: m1.memberId,
          memberName: m1.name,
          amount: 5000,
          method: 'cash',
          paymentType: 'membership',
          invoiceNo: 'INV-100001',
          paidOn: now,
        },
        {
          gymId: demoGym._id,
          memberId: m2.memberId,
          memberName: m2.name,
          amount: 8500,
          method: 'jazzcash',
          paymentType: 'membership',
          invoiceNo: 'INV-100002',
          paidOn: now,
        },
      ]);

      // Expenses
      await Expense.create([
        { gymId: demoGym._id, title: 'Electricity Bill LESCO', category: 'electricity', amount: 48500, spentOn: now },
        { gymId: demoGym._id, title: 'Floor Cleaner & Sanitizers', category: 'utilities', amount: 4200, spentOn: now },
      ]);

      // Attendance
      const todayStr = now.toISOString().split('T')[0];
      await Attendance.create([
        { gymId: demoGym._id, member: m1._id, memberId: m1.memberId, memberName: m1.name, dateStr: todayStr },
        { gymId: demoGym._id, member: m2._id, memberId: m2.memberId, memberName: m2.name, dateStr: todayStr },
      ]);

      console.log('[Seeder] Seeded sample members, payments, attendance & expenses');
    }

    console.log('[Seeder] Seeding finished successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Seeder] Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
