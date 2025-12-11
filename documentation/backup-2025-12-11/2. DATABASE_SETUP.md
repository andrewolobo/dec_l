# Database Setup Documentation

## Overview

This document outlines the database setup process for the DEC_L application, including schema design, ORM configuration, and migration steps.

---

## Project Requirements

The DEC_L application is a classifieds platform (Instagram-style news feed) for selling used household goods with the following key features:

- User registration with OAuth (Google & Microsoft) and mandatory phone numbers
- Post creation with drafts, scheduling, and like functionality
- Payment processing via mobile money with SMS monitoring
- Automated Instagram posting
- Azure SQL Server / PostgreSQL database support
- RESTful API layer for front-end/back-end communication

---

## Database Technology Stack

### ORM Selection: Prisma

**Prisma** was selected as the ORM solution for the following reasons:

- **Multi-database support**: PostgreSQL, SQL Server (Azure SQL), MySQL, SQLite
- **Type-safe queries**: Full TypeScript support with auto-generated types
- **Migration system**: Built-in database migration with version control
- **Developer experience**: Prisma Studio for visual database management
- **Relation handling**: Implicit and explicit relationship support
- **Performance**: Efficient query generation and connection pooling

### Database Provider

The application is configured to use **SQL Server** (local development) with the ability to switch to **Azure SQL** or **PostgreSQL** for production by simply changing the connection string.

---

## Database Schema Design

### Tables Implemented

The database consists of **10 core tables**:

#### 1. Users Table
Stores user account information with OAuth support.

**Key Fields:**
- UserID (Primary Key)
- Email (Unique, Required)
- PhoneNumber (Required - mandatory for all users)
- PaymentsNumber (for mobile money)
- FullName
- PasswordHash (NULL for OAuth users)
- OAuthProvider (Google, Microsoft, NULL)
- OAuthProviderId
- ProfilePictureURL
- Location
- IsActive, IsAdmin
- CreatedAt, UpdatedAt

#### 2. Categories Table
Categorization for posts.

**Key Fields:**
- CategoryID (Primary Key)
- CategoryName
- Description
- CreatedAt

#### 3. Posts Table
Core content table for user listings.

**Key Fields:**
- PostID (Primary Key)
- UserID
- Title, Description, Brand
- CategoryID
- Price (DECIMAL 18,2 - UGX currency)
- Location, GPSLocation
- DeliveryMethod (Private Pickup, Private Boda, SafeBoda)
- ContactNumber, EmailAddress
- Status (Draft, Scheduled, PendingPayment, Active, Expired, Rejected)
- ScheduledPublishTime, PublishedAt, ExpiresAt
- ViewCount, LikeCount
- Tier (pricing tier reference)
- InstagramPostID, InstagramPostedAt
- CreatedAt, UpdatedAt

#### 4. PostImages Table
Supports multiple images per post.

**Key Fields:**
- ImageID (Primary Key)
- PostID (Foreign Key)
- ImageURL
- DisplayOrder
- CreatedAt

#### 5. Likes Table
Tracks post likes with unique constraint.

**Key Fields:**
- LikeID (Primary Key)
- PostID (Foreign Key)
- UserID (Foreign Key)
- CreatedAt
- **Unique Constraint**: (PostID, UserID) - prevents duplicate likes

#### 6. Payments Table
Payment processing and tracking.

**Key Fields:**
- PaymentID (Primary Key)
- PostID, UserID
- Amount, Currency (default: UGX)
- PaymentMethod (MobileMoney)
- TransactionReference
- Status (Pending, Confirmed, Failed)
- ConfirmedAt, CreatedAt

#### 7. PricingTiers Table
Defines visibility duration and pricing for posts.

**Key Fields:**
- TierID (Primary Key)
- TierName
- VisibilityDays
- Price
- Description
- IsActive
- CreatedAt

#### 8. Messages Table
User-to-user messaging system.

**Key Fields:**
- MessageID (Primary Key)
- SenderID, RecipientID
- PostID (optional - link to post being discussed)
- MessageContent
- MessageType (text, image, system)
- AttachmentURL
- IsRead, ReadAt
- IsDeleted, DeletedBy
- IsEdited, EditedAt
- ParentMessageID (for threading/replies)
- CreatedAt, UpdatedAt
- **Check Constraint**: SenderID ≠ RecipientID

#### 9. Views Table
Individual view tracking for analytics.

**Key Fields:**
- ViewID (Primary Key)
- PostID
- UserID (nullable for anonymous views)
- IPAddress, UserAgent
- ReferrerURL, SessionID
- ViewDuration (seconds)
- IsUnique (24-hour window)
- CreatedAt

#### 10. ViewAnalytics Table
Aggregated daily analytics.

**Key Fields:**
- AnalyticsID (Primary Key)
- PostID
- Date (daily aggregation)
- TotalViews, UniqueViews
- AuthenticatedViews, AnonymousViews
- AverageViewDuration
- CreatedAt, UpdatedAt
- **Unique Constraint**: (PostID, Date)

---

## Relationship Design

### Implicit Relationships (No FK Constraints)

Per project requirements, the database uses **logical relationships without enforcing foreign key constraints**. This provides:

- Greater flexibility for data operations
- Simplified migration processes
- Reduced constraint-related errors
- Application-level referential integrity

Prisma handles relationships at the ORM level with:
- `onDelete: NoAction` for most relations
- `onDelete: Cascade` for dependent data (PostImages, Likes)

---

## Performance Optimizations

### Indexes Created

**Users Table:**
- `IX_Users_Email` - Fast email lookups for authentication
- `IX_Users_PhoneNumber` - Phone number searches

**Posts Table:**
- `IX_Posts_Status_PublishedAt` - Feed queries (composite index)
- `IX_Posts_CategoryID` - Category filtering
- `IX_Posts_UserID` - User's posts lookup

**Likes Table:**
- `IX_Likes_PostID` - Like count queries
- `IX_Likes_UserID` - User's liked posts

**Views Table:**
- `IX_Views_PostID` - Post view counts
- `IX_Views_UserID` - User view history
- `IX_Views_CreatedAt` - Time-based queries
- `IX_Views_SessionID` - Session tracking
- `IX_Views_PostID_UserID` - Composite for unique view detection
- `IX_Views_PostID_IPAddress` - IP-based unique views

**ViewAnalytics Table:**
- `IX_ViewAnalytics_PostID` - Analytics by post
- `IX_ViewAnalytics_Date` - Time-series queries

---

## Setup Process

### Step 1: Environment Configuration

**File:** `.env`

```env
# Database Configuration
DATABASE_URL="sqlserver://TYCHOSTATION;database=DEC_L;integratedSecurity=true;trustServerCertificate=true;encrypt=false"
```

**Connection String Parameters:**
- `TYCHOSTATION` - SQL Server instance name
- `database=DEC_L` - Database name
- `integratedSecurity=true` - Windows Authentication
- `trustServerCertificate=true` - Trust self-signed certificates (local dev)
- `encrypt=false` - Disable encryption for local development

**For Azure SQL / Production:**
```env
DATABASE_URL="sqlserver://your-server.database.windows.net:1433;database=DEC_L;user=admin;password=yourpassword;encrypt=true;trustServerCertificate=false"
```

**For PostgreSQL:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dec_l_db"
```

### Step 2: Prisma Schema Configuration

**File:** `prisma/schema.prisma`

Key configuration:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("DATABASE_URL")
}
```

The schema includes:
- 10 models mapped to database tables
- Field mappings (camelCase → PascalCase SQL columns)
- Type specifications (@db.NVarChar, @db.Decimal, @db.DateTime2)
- Indexes for performance optimization
- Implicit relationships without FK constraints

### Step 3: Install Dependencies

```bash
npm install
```

**Package Dependencies:**
- `@prisma/client` - Prisma ORM client
- `prisma` (dev) - Prisma CLI tools

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

This command:
- Reads the Prisma schema
- Generates TypeScript types
- Creates type-safe Prisma Client
- Output: Auto-generated client for database operations

### Step 5: Database Migration

#### Option A: Create New Database with Migrations

```bash
npx prisma migrate dev --name init
```

This command:
1. Creates the database if it doesn't exist
2. Generates SQL migration files
3. Applies migrations to the database
4. Regenerates Prisma Client

**Migration File Location:** `prisma/migrations/`

#### Option B: Existing Database (Introspection)

```bash
npx prisma db pull
```

This command:
- Introspects existing database schema
- Updates `schema.prisma` to match database
- Useful for existing databases

### Step 6: Verify Setup with Prisma Studio

```bash
npx prisma studio
```

Opens visual database browser at `http://localhost:5555`

Features:
- View all tables and data
- Edit records directly
- Test relationships
- Query data visually

---

## Troubleshooting

### Common Issues

#### 1. TLS Connection Error

**Error:**
```
Error: P1011: Error opening a TLS connection: The TLS settings didn't allow the connection to be established.
```

**Solution:**
Add SSL parameters to connection string:
```
DATABASE_URL="sqlserver://SERVER;database=DB;integratedSecurity=true;trustServerCertificate=true;encrypt=false"
```

#### 2. Windows Authentication Issues

**Error:** Authentication failure with integrated security

**Solutions:**
- Ensure SQL Server allows Windows Authentication
- Run command prompt as administrator
- Verify SQL Server service is running
- Check user has database access permissions

#### 3. Database Connection Timeout

**Error:** Connection timeout errors

**Solutions:**
- Verify SQL Server is running
- Check firewall settings
- Ensure correct server name/port
- Test connection with SQL Server Management Studio

#### 4. Migration Conflicts

**Error:** Migration failed due to existing schema

**Solutions:**
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or manually resolve conflicts
npx prisma migrate resolve --applied "migration_name"
```

---

## Database Operations

### Common Prisma Commands

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name description_of_changes

# Apply migrations in production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# View/edit data in browser
npx prisma studio

# Introspect existing database
npx prisma db pull

# Push schema without migrations (prototyping)
npx prisma db push

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

---

## Next Steps

### Phase 2: API Development

1. **Express API Setup**
   - Configure Express server
   - Set up middleware (CORS, body-parser, helmet)
   - Error handling middleware

2. **OAuth Implementation**
   - Google OAuth 2.0 integration
   - Microsoft OAuth 2.0 integration
   - JWT token generation and validation
   - Phone number verification flow

3. **API Endpoints Implementation**
   - Authentication endpoints (register, login, verify, refresh)
   - Post endpoints (CRUD, like/unlike, feed)
   - User profile endpoints
   - Category endpoints
   - Admin endpoints (approve/reject posts)

4. **Repository Layer**
   - UserRepository
   - PostRepository
   - LikeRepository
   - CategoryRepository
   - PaymentRepository
   - ViewRepository

### Phase 3: Additional Features

1. **Instagram Integration**
   - Instagram Graph API setup
   - Automated post publishing
   - Image optimization
   - Error handling and retry logic

2. **Payment Processing**
   - Mobile money SMS monitoring (Android app)
   - Payment confirmation API
   - Post activation workflow

3. **Analytics Implementation**
   - View tracking middleware
   - Daily analytics aggregation job
   - Trending posts algorithm

---

## Database Backup & Maintenance

### Backup Strategy

**Development:**
```bash
# Export schema
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > backup.sql

# Backup with SQL Server tools
sqlcmd -S TYCHOSTATION -d DEC_L -E -Q "BACKUP DATABASE DEC_L TO DISK='C:\Backups\DEC_L.bak'"
```

**Production (Azure SQL):**
- Configure automated backups in Azure Portal
- Point-in-time restore available
- Geo-redundant backup options

### Maintenance Tasks

- Regular index rebuilding for performance
- Monitor query performance with Prisma query logs
- Archive old view records (> 90 days)
- Clean up soft-deleted messages
- Monitor database size and growth

---

## Security Considerations

1. **Connection Strings**
   - Never commit `.env` file to version control
   - Use Azure Key Vault or environment variables in production
   - Rotate database credentials periodically

2. **SQL Injection Prevention**
   - Prisma uses parameterized queries automatically
   - Always use Prisma Client methods (no raw SQL unless necessary)

3. **Data Protection**
   - Enable encryption at rest (Azure SQL default)
   - Use TLS for production connections (`encrypt=true`)
   - Implement proper access controls

4. **Sensitive Data**
   - Hash passwords with bcrypt (12+ rounds)
   - Store OAuth tokens securely
   - Mask payment information in logs

---

## Performance Monitoring

### Key Metrics to Track

1. **Query Performance**
   - Enable Prisma query logging in development
   - Monitor slow queries (> 100ms)
   - Use database query execution plans

2. **Connection Pooling**
   - Prisma automatically handles connection pooling
   - Monitor connection count in production
   - Adjust pool size based on load

3. **Index Usage**
   - Monitor index hit rates
   - Identify missing indexes from slow queries
   - Remove unused indexes

---

## Conclusion

The database layer for DEC_L has been successfully configured with:

✅ Prisma ORM with SQL Server support  
✅ Comprehensive schema covering 10 core tables  
✅ Performance-optimized indexes  
✅ Flexible multi-database support  
✅ Type-safe database operations  
✅ Migration system in place  
✅ Development environment ready  

The foundation is now ready for API development and integration with the front-end application.

---

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [SQL Server Connection Strings](https://www.connectionstrings.com/sql-server/)
- [Prisma SQL Server Connector](https://www.prisma.io/docs/concepts/database-connectors/sql-server)
- Project Specification: `specification/final/final-draft.md`
- Database Schema: `specification/drafts/database.md`
