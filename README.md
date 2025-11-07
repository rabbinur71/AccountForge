AccountForge Backend. Reusable PERN+TS Auth & Admin Boilerplate
A production-ready, type-safe backend foundation for user authentication, role-based admin, and audit logging, built with PostgreSQL, Express, Redis, and TypeScript.

Designed for local development with PostgreSQL installed directly (no Docker). Drop it into any project and customize in minutes.

23 Endpoints:
Register user - a verification email is sent
Resend verification email
Verify email
User logic after email verification
Forgot password - Password Reset mail sent
Reset password
Login after password reset
Get profile (api/auth/profile)
Get user profile (api/users/profile)- full detail about a user
Update profile
Change passord
Login after password change
Upload avatar
Delete avatar
Login as Admin
Admin password change
Get all users by admin
Get user by Id by admin
Update user info by admin
Get audit logs by admin
Get dashboard stats by admin
Delete user by admin- soft delete then parmanent delete
