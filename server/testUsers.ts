// Script to create test users for the application
import { createAdminUser, createAgentUser, signUp, confirmUserEmail, createTestUsersWithConfirmedEmails } from './authService';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { supabase } from './supabaseClient';

export async function createTestUsers() {
  try {
    console.log('🚀 Starting enhanced test users setup...');
    console.log('📧 Using admin API to create users with confirmed emails');
    
    // First try the enhanced method that creates users with confirmed emails
    await createTestUsersWithConfirmedEmails();
    
    console.log('\n🎉 Enhanced test users setup completed!');
    console.log('\n📋 Test User Credentials:');
    console.log('   👨‍💼 Admin: admin@premier.com / admin123');
    console.log('   🏠 Agent: corretor@premier.com / 123456');
    console.log('\nℹ️ These users should now be able to log in without email confirmation issues.');
    
  } catch (error: any) {
    console.error('❌ Error in enhanced test users setup:', error.message);
    console.log('\n🔄 Falling back to legacy method...');
    
    // Fallback to the original method
    try {
      await createTestUsersLegacy();
    } catch (fallbackError) {
      console.error('❌ Fallback method also failed:', fallbackError);
    }
  }
}

// Legacy method as fallback
export async function createTestUsersLegacy() {
  try {
    console.log('🚀 Starting legacy test users setup...');
    console.log('📧 Note: Test users will be created with email confirmation bypassed where possible');

    // Test users configuration
    const testUsers = [
      {
        email: 'admin@premier.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'Premier',
        role: 'admin',
        createFunction: createAdminUser
      },
      {
        email: 'corretor@premier.com',
        password: '123456',
        firstName: 'João',
        lastName: 'Silva',
        role: 'agent',
        createFunction: createAgentUser
      }
    ];

    for (const testUser of testUsers) {
      console.log(`\n🔍 Processing ${testUser.role} user: ${testUser.email}`);
      
      try {
        // Check if user exists in local database
        const existingLocalUser = await db
          .select()
          .from(users)
          .where(eq(users.email, testUser.email))
          .limit(1);

        // Check if user exists in Supabase Auth
        let supabaseUser = null;
        try {
          const { data: userList } = await supabase.auth.admin.listUsers();
          supabaseUser = userList.users.find(user => user.email === testUser.email);
        } catch (adminError) {
          console.log(`⚠️ Cannot check Supabase Auth admin - proceeding with regular checks`);
        }

        if (existingLocalUser.length === 0) {
          // User doesn't exist in local database
          console.log(`👤 Creating ${testUser.role} user in system...`);
          
          try {
            const result = await testUser.createFunction(
              testUser.email,
              testUser.password,
              testUser.firstName,
              testUser.lastName
            );
            console.log(`✅ ${testUser.role} user created successfully: ${testUser.email}`);
            
            // Try to confirm email if possible
            if (supabaseUser && !supabaseUser.email_confirmed_at) {
              console.log(`📧 Attempting to confirm email for ${testUser.email}...`);
              const confirmed = await confirmUserEmail(testUser.email);
              if (confirmed) {
                console.log(`✅ Email confirmed for ${testUser.email}`);
              } else {
                console.log(`⚠️ Could not auto-confirm email for ${testUser.email} - user may need to confirm manually`);
              }
            }
            
          } catch (createError: any) {
            console.error(`❌ Error creating ${testUser.role} user ${testUser.email}:`, createError.message);
            
            // If user exists in Supabase but not in local DB, create local record
            if (supabaseUser && createError.message.includes('User already registered')) {
              console.log(`🔄 User exists in Supabase, creating local record...`);
              try {
                await db.insert(users).values({
                  id: supabaseUser.id,
                  email: supabaseUser.email || testUser.email,
                  firstName: testUser.firstName,
                  lastName: testUser.lastName,
                  role: testUser.role
                });
                console.log(`✅ Local database record created for ${testUser.email}`);
              } catch (dbError: any) {
                if (dbError.code !== '23505') { // Ignore unique constraint violations
                  console.error(`❌ Failed to create local record:`, dbError.message);
                }
              }
            }
          }
          
        } else {
          console.log(`ℹ️ ${testUser.role} user already exists in local database`);
          
          // Ensure role is correct
          if (existingLocalUser[0].role !== testUser.role) {
            console.log(`🔄 Updating role from ${existingLocalUser[0].role} to ${testUser.role}`);
            await db.update(users)
              .set({ 
                role: testUser.role,
                firstName: testUser.firstName,
                lastName: testUser.lastName,
                updatedAt: new Date()
              })
              .where(eq(users.id, existingLocalUser[0].id));
            console.log(`✅ Role updated for ${testUser.email}`);
          }
          
          // Check if email is confirmed in Supabase
          if (supabaseUser && !supabaseUser.email_confirmed_at) {
            console.log(`📧 Attempting to confirm email for existing user ${testUser.email}...`);
            const confirmed = await confirmUserEmail(testUser.email);
            if (confirmed) {
              console.log(`✅ Email confirmed for ${testUser.email}`);
            }
          }
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing ${testUser.role} user ${testUser.email}:`, error.message);
      }
    }

    console.log('\n🎉 Legacy test users setup completed!');
    console.log('\n📋 Test User Credentials:');
    console.log('   👨‍💼 Admin: admin@premier.com / admin123');
    console.log('   🏠 Agent: corretor@premier.com / 123456');
    console.log('\n💡 If you encounter "Email not confirmed" errors, check the Supabase dashboard.');
    
  } catch (error) {
    console.error('❌ Error in legacy test users setup:', error);
  }
}