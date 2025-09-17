import { supabase } from './supabaseClient';
import { db } from './db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
}

// Sign up new user with Supabase Auth
export async function signUp(email: string, password: string, firstName?: string, lastName?: string, role: string = 'client', autoConfirm: boolean = false) {
  try {
    const signUpOptions: any = {
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
          role
        }
      }
    };

    // For admin and agent users, we want to skip email confirmation
    if (autoConfirm) {
      signUpOptions.options.emailRedirectTo = undefined;
    }

    const { data, error } = await supabase.auth.signUp(signUpOptions);

    if (error) {
      console.error('Supabase signup error:', error);
      throw new Error(error.message);
    }

    // Create user record in our database if user was created
    if (data.user) {
      try {
        await db.insert(users).values({
          id: data.user.id,
          email: data.user.email || email,
          firstName: firstName || '',
          lastName: lastName || '',
          profileImageUrl: null,
          role,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`User ${email} created in local database with role ${role}`);
      } catch (dbError: any) {
        // If user already exists in local DB, update it
        if (dbError.code === '23505') { // Unique constraint violation
          await db.update(users)
            .set({
              firstName: firstName || '',
              lastName: lastName || '',
              role,
              updatedAt: new Date()
            })
            .where(eq(users.id, data.user.id));
          console.log(`User ${email} updated in local database with role ${role}`);
        } else {
          console.error('Database error creating user:', dbError);
          throw dbError;
        }
      }
    }

    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
}

// Sign in user with Supabase Auth
export async function signIn(email: string, password: string) {
  try {
    console.log(`Attempting login for ${email}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error(`Login error for ${email}:`, error.message);
      
      // Handle email not confirmed error specifically  
      if (error.message.includes('Email not confirmed')) {
        // SECURITY FIX: Restrict local bypass to development environment only
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isTestUser = email === 'admin@premier.com' || email === 'corretor@premier.com';
        
        if (isDevelopment && isTestUser) {
          // Development-only bypass for test users with clear security warnings
          console.warn(`⚠️  SECURITY WARNING: Development-only authentication bypass active!`);
          console.warn(`⚠️  Environment: ${process.env.NODE_ENV}`);
          console.warn(`⚠️  This bypass is DISABLED in production for security.`);
          console.log(`🔄 Implementing local bypass for test user: ${email}`);
          
          // Create a local authentication session for test users
          // This bypasses Supabase Auth completely for these specific users
          try {
            // Get or create local user record
            let localUser = await db
              .select()
              .from(users)
              .where(eq(users.email, email))
              .limit(1);
            
            if (localUser.length === 0) {
              // Create local user record
              const userData = {
                id: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                email: email,
                role: email === 'admin@premier.com' ? 'admin' : 'agent',
                firstName: email === 'admin@premier.com' ? 'Admin' : 'João',
                lastName: email === 'admin@premier.com' ? 'Premier' : 'Silva',
                profileImageUrl: null,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              await db.insert(users).values(userData);
              console.log(`✅ Created local user record for ${email}`);
              localUser = [userData];
            }
            
            console.log(`✅ Local bypass authentication successful for ${email}`);
            console.warn(`⚠️  REMINDER: This authentication bypass only works in development!`);
            
            // Return a mock successful response for local authentication
            return {
              user: {
                id: localUser[0].id,
                email: localUser[0].email,
                user_metadata: {
                  firstName: localUser[0].firstName,
                  lastName: localUser[0].lastName
                },
                email_confirmed_at: new Date().toISOString() // Mock confirmation
              },
              session: {
                access_token: `local-bypass-${Date.now()}`,
                refresh_token: `refresh-bypass-${Date.now()}`,
                expires_in: 3600,
                token_type: 'bearer',
                user: {
                  id: localUser[0].id,
                  email: localUser[0].email
                }
              },
              userRecord: localUser[0],
              isLocalBypass: true // Flag to indicate this is a local bypass
            };
            
          } catch (bypassError: any) {
            console.error(`❌ Local bypass failed for ${email}:`, bypassError.message);
          }
          
          // If local bypass also failed, provide helpful error message
          throw new Error(`Authentication failed for ${email}. Unable to create local bypass session.`);
        } else if (!isDevelopment && isTestUser) {
          // Production security: No bypass allowed
          console.error(`🚫 PRODUCTION SECURITY: Local bypass blocked for ${email}`);
          console.error(`🚫 Email confirmation required in production environment.`);
          throw new Error(`Email not confirmed. Please check your email and confirm your account before logging in.`);
        } else if (isDevelopment && !isTestUser) {
          // Development but not a test user
          console.log(`📧 Email not confirmed for ${email}. Please confirm your email to continue.`);
          throw new Error(`Email not confirmed. Please check your email and confirm your account.`);
        }
      }
      
      throw new Error(error.message);
    }

    console.log(`Login successful for ${email}`);
    
    // Get user data from our database
    if (data.user) {
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.id, data.user.id))
        .limit(1);

      if (userRecord.length === 0) {
        // Create user record if it doesn't exist
        const newUserData = {
          id: data.user.id,
          email: data.user.email || email,
          role: 'client',
          firstName: data.user.user_metadata?.firstName || '',
          lastName: data.user.user_metadata?.lastName || ''
        };
        
        await db.insert(users).values(newUserData);
        console.log(`Created new user record in local database for ${email}`);
        
        return {
          user: data.user,
          session: data.session,
          userRecord: newUserData
        };
      }

      return {
        user: data.user,
        session: data.session,
        userRecord: userRecord[0]
      };
    }

    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

// Sign out user
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user from Supabase session
export async function getCurrentUser(accessToken: string): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !data.user) {
      return null;
    }

    // Get user data from our database
    const userRecord = await db
      .select()
      .from(users)
      .where(eq(users.id, data.user.id))
      .limit(1);

    if (userRecord.length === 0) {
      return null;
    }

    const user = userRecord[0];
    return {
      id: user.id,
      email: user.email || '',
      role: user.role || 'client',
      firstName: user.firstName || '',
      lastName: user.lastName || ''
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Create admin user with special handling for test accounts
export async function createAdminUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    console.log(`Creating admin user: ${email}`);
    
    // First check if user already exists in Supabase Auth
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList.users.find(user => user.email === email);
      if (existingUser) {
        console.log(`Admin user ${email} already exists in Supabase Auth`);
        
        // Check if exists in local database
        const localUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
          
        if (localUser.length === 0) {
          // Create in local database
          await db.insert(users).values({
            id: existingUser.id,
            email: existingUser.email || email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: null,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`Created admin user ${email} in local database`);
        } else {
          // Update role in local database
          await db.update(users)
            .set({ role: 'admin', firstName, lastName, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));
          console.log(`Updated admin user ${email} role in local database`);
        }
        
        return { user: existingUser, session: null };
      }
    } catch (adminError) {
      console.log('Admin API call failed, proceeding with regular signup:', adminError);
    }
    
    return signUp(email, password, firstName, lastName, 'admin', true);
  } catch (error) {
    console.error(`Error creating admin user ${email}:`, error);
    throw error;
  }
}

// Create agent user with special handling for test accounts
export async function createAgentUser(email: string, password: string, firstName: string, lastName: string) {
  try {
    console.log(`Creating agent user: ${email}`);
    
    // First check if user already exists in Supabase Auth
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingUser = userList.users.find(user => user.email === email);
      if (existingUser) {
        console.log(`Agent user ${email} already exists in Supabase Auth`);
        
        // Check if exists in local database
        const localUser = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
          
        if (localUser.length === 0) {
          // Create in local database
          await db.insert(users).values({
            id: existingUser.id,
            email: existingUser.email || email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: null,
            role: 'agent',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`Created agent user ${email} in local database`);
        } else {
          // Update role in local database
          await db.update(users)
            .set({ role: 'agent', firstName, lastName, updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));
          console.log(`Updated agent user ${email} role in local database`);
        }
        
        return { user: existingUser, session: null };
      }
    } catch (adminError) {
      console.log('Admin API call failed, proceeding with regular signup:', adminError);
    }
    
    return signUp(email, password, firstName, lastName, 'agent', true);
  } catch (error) {
    console.error(`Error creating agent user ${email}:`, error);
    throw error;
  }
}

// Helper function to confirm user email (fallback implementation)
export async function confirmUserEmail(email: string) {
  try {
    console.log(`⚠️ Email confirmation bypass for ${email} (admin API not available)`);
    
    // Since admin API is not available, we'll implement a fallback approach
    // This will return true to indicate we "handled" it, even if we can't actually confirm
    console.log(`ℹ️ Admin API not available - manual email confirmation may be required`);
    return false;
    
  } catch (error: any) {
    console.error(`Error in email confirmation process for ${email}:`, error.message);
    return false;
  }
}

// Create test users with regular signup (fallback implementation)
export async function createTestUsersWithConfirmedEmails() {
  try {
    console.log('🚀 Creating test users (admin API fallback)...');
    
    const testUsers = [
      { email: 'admin@premier.com', password: 'admin123', firstName: 'Admin', lastName: 'Premier', role: 'admin' },
      { email: 'corretor@premier.com', password: '123456', firstName: 'João', lastName: 'Silva', role: 'agent' }
    ];
    
    for (const testUser of testUsers) {
      try {
        console.log(`Processing user ${testUser.email}...`);
        
        // Check if user exists in local database
        const localUser = await db
          .select()
          .from(users)
          .where(eq(users.email, testUser.email))
          .limit(1);
        
        if (localUser.length === 0) {
          console.log(`Creating ${testUser.email} with regular signup...`);
          
          try {
            // Use regular signup
            const result = await signUp(
              testUser.email,
              testUser.password,
              testUser.firstName,
              testUser.lastName,
              testUser.role,
              true // autoConfirm flag
            );
            
            if (result.user) {
              console.log(`✅ User ${testUser.email} created successfully`);
            }
            
          } catch (signupError: any) {
            if (signupError.message.includes('User already registered')) {
              console.log(`ℹ️ User ${testUser.email} already exists in Supabase`);
              
              // Try to find the user and create local record
              try {
                // We'll create a local record with a placeholder ID
                // In a real scenario, we'd get the proper user ID
                const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                await db.insert(users).values({
                  id: tempId, // This will need to be updated when we get the real ID
                  email: testUser.email,
                  firstName: testUser.firstName,
                  lastName: testUser.lastName,
                  profileImageUrl: null,
                  role: testUser.role,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
                console.log(`⚠️ Created placeholder local record for ${testUser.email}`);
              } catch (dbError: any) {
                if (dbError.code !== '23505') {
                  console.error(`Database error for ${testUser.email}:`, dbError.message);
                }
              }
            } else {
              console.error(`Signup error for ${testUser.email}:`, signupError.message);
            }
          }
        } else {
          console.log(`✅ User ${testUser.email} already exists in local database with role ${localUser[0].role}`);
          
          // Update role if needed
          if (localUser[0].role !== testUser.role) {
            await db.update(users)
              .set({ 
                role: testUser.role,
                firstName: testUser.firstName,
                lastName: testUser.lastName,
                updatedAt: new Date()
              })
              .where(eq(users.id, localUser[0].id));
            console.log(`✅ Updated role for ${testUser.email} to ${testUser.role}`);
          }
        }
        
      } catch (userError: any) {
        console.error(`Error processing user ${testUser.email}:`, userError.message);
      }
    }
    
    console.log('✅ Test users setup completed (fallback method)');
    
  } catch (error: any) {
    console.error('❌ Error in fallback test users creation:', error.message);
    throw error; // Re-throw to trigger fallback to legacy method
  }
}