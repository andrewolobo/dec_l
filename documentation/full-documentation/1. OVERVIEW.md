## Description

A modern classifieds platform for buying and selling used household goods, designed with an Instagram-style interface offering a continuous, scrollable feed of visually rich listings. Items appear as card-based posts featuring images, pricing, and concise descriptions, enabling users to browse seamlessly and discover new content in a dynamic stream.

All listings created on the platform are automatically cross-posted to Instagram to maximize visibility.
The system includes integrated payment handling: when a user submits a new listing, it enters a pending state until payment is confirmed. Payments are made via mobile money to a designated phone number managed on an Android device. A companion application monitors incoming payment messages in real time, and upon detecting a valid payment, automatically activates the corresponding listing.

Administrators can review and curate listings to maintain quality. Posts remain visible for a limited duration, with pricing tiers based on ‘peak visibility’ periods to optimize exposure.

## Technical Specifications

### 1. System Architecture

#### 1.1 Overview

The application follows a three-tier architecture:

- **Web UI Layer**: Simplistic, responsive front-end
- **API Layer**: RESTful API for front-end/back-end communication
- **Data Layer**: Azure SQL Database

#### 1.2 Components

- **Web Application**: Browser-based UI for desktop and mobile web
- **API Server**: Handles business logic, authentication, and external integrations
- **Mobile Companion App**: Android application for payment monitoring
- **Database**: Azure SQL Database for persistent storage

---

### 2. Web UI Layer

#### 2.1 Design Principles

- Simplistic, Instagram-style interface
- Never-ending news feed with infinite scroll
- Card-based post layout
- Responsive design for mobile and desktop browsers

#### 2.2 Key Features

- User registration and authentication
- News feed browsing
- Post creation with draft and scheduling capabilities
- Like functionality on posts
- User profile management

#### 2.3 Technology Stack (Recommended)

- Framework: Svelte
- State Management: Redux/Vuex or Context API
- HTTP Client: Axios or Fetch API
- UI Components: Material-UI

---

### 3. User Authentication & Registration

#### 3.1 OAuth Integration

- **Google OAuth 2.0**: Social login via Google accounts
- **Microsoft OAuth 2.0**: Social login via Microsoft accounts
- Standard email/password registration as fallback

#### 3.2 Registration Requirements

- **Mandatory Fields**:
  - Email address
  - Phone number (mandatory for all users)
  - Full name
  - Password (for non-OAuth registrations)
- **Optional Fields**:
  - Profile picture
  - Location

#### 3.3 Authentication Flow

1. User selects authentication method (Google/Microsoft/Email)
2. OAuth providers redirect to authorization pages
3. Upon successful authentication, user is prompted for phone number if not provided
4. Phone number verification via SMS OTP (recommended)
5. User session created with JWT or similar token-based authentication

---

### 4. Post Management

#### 4.1 Post Structure

Each post contains:

- Unique Post ID
- User ID (author)
- Title
- Category ID
- Brand (optional)
- Description
- Price (UGX - Uganda Shillings)
- Location
- Delivery Method (Private pickup, Private boda, SafeBoda)
- Contact Number
- Email Address (optional)
- Images (multiple upload support)
- Status (Draft, Scheduled, Published, Pending Payment, Active, Expired)
- Created timestamp
- Scheduled publish time (optional)
- Like count
- View count

#### 4.2 Post Creation Workflow

1. User creates a post with required information
2. User can save as draft for later editing
3. User can schedule post for future publication
4. Post enters "Pending Payment" status
5. Upon payment confirmation, post becomes "Active"
6. Post automatically cross-posted to Instagram

#### 4.3 Like Structure

- Many-to-many relationship between Users and Posts
- Track user who liked and timestamp
- Display like count on posts
- Prevent duplicate likes from same user
- Real-time like count updates

---

### 5. API Layer

#### 5.1 Core Responsibilities

- Handle all communication between front-end and back-end
- User authentication and authorization
- CRUD operations for posts
- Payment status verification
- Instagram API integration for automated posting
- File upload handling for post images

#### 5.2 API Endpoints (Examples)

**Authentication**

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/oauth/google` - Google OAuth callback
- `POST /api/auth/oauth/microsoft` - Microsoft OAuth callback
- `POST /api/auth/verify-phone` - Phone number verification
- `POST /api/auth/refresh` - Refresh access token

**Posts**

- `GET /api/posts` - Get feed (paginated)
- `GET /api/posts/{id}` - Get single post
- `POST /api/posts` - Create new post
- `PUT /api/posts/{id}` - Update post
- `DELETE /api/posts/{id}` - Delete post
- `POST /api/posts/{id}/like` - Like a post
- `DELETE /api/posts/{id}/like` - Unlike a post
- `GET /api/posts/drafts` - Get user's draft posts
- `POST /api/posts/{id}/schedule` - Schedule post for later

**Categories**

- `GET /api/categories` - Get all categories

**User**

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

**Admin**

- `GET /api/admin/posts/pending` - Get pending posts for review
- `PUT /api/admin/posts/{id}/approve` - Approve post
- `PUT /api/admin/posts/{id}/reject` - Reject post

#### 5.3 Instagram Integration

- **Instagram Graph API** or **Instagram Basic Display API**
- Automated posting of approved listings to Instagram
- Image optimization for Instagram format requirements
- Post description formatting with hashtags
- Link to original listing in bio or description

#### 5.4 Technology Stack (Recommended)

- Runtime: Node.js (Express), Python (Django/FastAPI), or .NET Core
- Authentication: JWT tokens, OAuth 2.0 libraries
- API Documentation: Swagger/OpenAPI
- File Storage: Azure Blob Storage for images

---

### 6. Database Schema (Azure SQL)

#### 6.1 Users Table

```sql
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(255) UNIQUE NOT NULL,
    PhoneNumber NVARCHAR(20) NOT NULL,
    FullName NVARCHAR(255) NOT NULL,
    PasswordHash NVARCHAR(255), -- NULL for OAuth users
    OAuthProvider NVARCHAR(50), -- 'Google', 'Microsoft', NULL
    OAuthProviderId NVARCHAR(255),
    ProfilePictureURL NVARCHAR(500),
    Location NVARCHAR(255),
    IsActive BIT DEFAULT 1,
    IsAdmin BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
```

#### 6.2 Categories Table

```sql
CREATE TABLE Categories (
    CategoryID INT PRIMARY KEY IDENTITY(1,1),
    CategoryName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

#### 6.3 Posts Table

```sql
CREATE TABLE Posts (
    PostID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT NOT NULL,
    Title NVARCHAR(255) NOT NULL,
    CategoryID INT NOT NULL,
    Brand NVARCHAR(100),
    Description NVARCHAR(MAX) NOT NULL,
    Price DECIMAL(18,2) NOT NULL, -- UGX
    Location NVARCHAR(255) NOT NULL,
    DeliveryMethod NVARCHAR(100), -- 'Private Pickup', 'Private Boda', 'SafeBoda'
    ContactNumber NVARCHAR(20) NOT NULL,
    EmailAddress NVARCHAR(255),
    Status NVARCHAR(50) NOT NULL, -- 'Draft', 'Scheduled', 'PendingPayment', 'Active', 'Expired', 'Rejected'
    ScheduledPublishTime DATETIME2,
    PublishedAt DATETIME2,
    ExpiresAt DATETIME2,
    ViewCount INT DEFAULT 0,
    LikeCount INT DEFAULT 0,
    InstagramPostID NVARCHAR(255), -- Instagram post identifier
    InstagramPostedAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);
```

#### 6.4 PostImages Table

```sql
CREATE TABLE PostImages (
    ImageID INT PRIMARY KEY IDENTITY(1,1),
    PostID INT NOT NULL,
    ImageURL NVARCHAR(500) NOT NULL,
    DisplayOrder INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE
);
```

#### 6.5 Likes Table

```sql
CREATE TABLE Likes (
    LikeID INT PRIMARY KEY IDENTITY(1,1),
    PostID INT NOT NULL,
    UserID INT NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    UNIQUE (PostID, UserID) -- Prevent duplicate likes
);
```

#### 6.6 Payments Table

```sql
CREATE TABLE Payments (
    PaymentID INT PRIMARY KEY IDENTITY(1,1),
    PostID INT NOT NULL,
    UserID INT NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    Currency NVARCHAR(3) DEFAULT 'UGX',
    PaymentMethod NVARCHAR(50) NOT NULL, -- 'MobileMoney'
    TransactionReference NVARCHAR(255),
    Status NVARCHAR(50) NOT NULL, -- 'Pending', 'Confirmed', 'Failed'
    ConfirmedAt DATETIME2,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (PostID) REFERENCES Posts(PostID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
```

#### 6.7 PricingTiers Table

```sql
CREATE TABLE PricingTiers (
    TierID INT PRIMARY KEY IDENTITY(1,1),
    TierName NVARCHAR(100) NOT NULL,
    VisibilityDays INT NOT NULL,
    Price DECIMAL(18,2) NOT NULL,
    Description NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);
```

#### 6.8 Indexes (Performance Optimization)

```sql
-- Posts feed queries
CREATE INDEX IX_Posts_Status_PublishedAt ON Posts(Status, PublishedAt DESC);
CREATE INDEX IX_Posts_CategoryID ON Posts(CategoryID);
CREATE INDEX IX_Posts_UserID ON Posts(UserID);

-- Likes queries
CREATE INDEX IX_Likes_PostID ON Likes(PostID);
CREATE INDEX IX_Likes_UserID ON Likes(UserID);

-- User lookup
CREATE INDEX IX_Users_Email ON Users(Email);
CREATE INDEX IX_Users_PhoneNumber ON Users(PhoneNumber);
```

---

### 7. Mobile Companion Application

#### 7.1 Purpose

Android application that monitors mobile money payment messages in real-time and automatically activates corresponding posts upon payment confirmation.

#### 7.2 Key Features

- **SMS Monitoring**: Read incoming SMS messages from mobile money providers
- **Payment Parsing**: Extract transaction details (amount, reference, sender)
- **API Communication**: Send payment confirmation to backend API
- **Real-time Notifications**: Alert when payments are received
- **Payment History**: Display processed payments
- **Manual Override**: Admin can manually confirm payments

#### 7.3 Technical Requirements

- **Platform**: Android (Java/Kotlin)
- **Permissions**:
  - READ_SMS
  - RECEIVE_SMS
  - INTERNET
- **Background Service**: Persistent service to monitor SMS
- **API Integration**: REST API calls to backend
- **Security**: Secure storage of API keys and credentials

#### 7.4 Payment Workflow

1. User submits post and makes mobile money payment
2. Mobile money provider sends SMS to designated phone
3. Android app receives and parses SMS
4. App extracts transaction reference and amount
5. App sends confirmation to API endpoint
6. API verifies payment and updates post status to "Active"
7. Post becomes visible in feed
8. Post automatically published to Instagram

---

### 8. Security Considerations

#### 8.1 Authentication & Authorization

- JWT token-based authentication with refresh tokens
- OAuth 2.0 implementation for Google and Microsoft
- Phone number verification via OTP
- Password hashing with bcrypt or similar (min 12 rounds)
- Rate limiting on authentication endpoints

#### 8.2 API Security

- HTTPS/TLS encryption for all API communications
- CORS configuration for allowed origins
- API rate limiting per user/IP
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection on user-generated content

#### 8.3 Data Protection

- Encryption at rest for Azure SQL Database
- Secure storage of OAuth tokens and API keys
- Personal data handling compliant with GDPR/local regulations
- Regular security audits and vulnerability scanning

#### 8.4 Mobile App Security

- Secure storage of API credentials on Android device
- Certificate pinning for API communications
- Obfuscation of sensitive code
- Root detection (optional)

---

### 9. Deployment & Infrastructure

#### 9.1 Azure Services

- **Azure App Service**: Host Web API
- **Azure SQL Database**: Primary data storage
- **Azure Blob Storage**: Image and media file storage
- **Azure CDN**: Content delivery for static assets and images
- **Azure Key Vault**: Secure storage of secrets and API keys
- **Azure Application Insights**: Monitoring and logging

#### 9.2 Environment Configuration

- Development, Staging, and Production environments
- Environment-specific configuration files
- Automated deployment pipelines (CI/CD)

#### 9.3 Scalability

- Horizontal scaling for API servers
- Database connection pooling
- Caching layer (Redis/Azure Cache for Redis) for frequently accessed data
- Image CDN for optimized delivery

---

### 10. Third-Party Integrations

#### 10.1 OAuth Providers

- Google OAuth 2.0 API
- Microsoft Identity Platform (Azure AD)

#### 10.2 Instagram API

- Instagram Graph API for automated posting
- Instagram Basic Display API (alternative)
- Compliance with Instagram posting guidelines

#### 10.3 SMS/Mobile Money

- Mobile money provider integration (MTN, Airtel, etc.)
- SMS parsing libraries for payment confirmation

---

### 11. Development Roadmap

#### Phase 1: Core Foundation (Weeks 1-4)

- Database schema setup on Azure SQL
- Basic API structure with authentication
- User registration with OAuth integration
- Phone number verification

#### Phase 2: Post Management (Weeks 5-8)

- Post CRUD operations
- Draft and scheduling functionality
- Image upload and storage
- Like functionality
- News feed with pagination

#### Phase 3: Payment Integration (Weeks 9-10)

- Payment workflow implementation
- Mobile companion app development
- SMS monitoring and parsing
- Payment confirmation API

#### Phase 4: Instagram Integration (Weeks 11-12)

- Instagram API setup and authentication
- Automated posting functionality
- Image optimization for Instagram
- Error handling and retry logic

#### Phase 5: Web UI Development (Weeks 13-16)

- Front-end application development
- UI/UX implementation
- Responsive design
- Integration with API

#### Phase 6: Testing & Deployment (Weeks 17-20)

- Unit and integration testing
- Security testing
- Performance optimization
- UAT and bug fixes
- Production deployment

---

### 12. Monitoring & Maintenance

#### 12.1 Application Monitoring

- Azure Application Insights for performance tracking
- Error logging and alerting
- API response time monitoring
- Database query performance analysis

#### 12.2 Maintenance Tasks

- Regular database backups
- Security patches and updates
- API version management
- User data cleanup (expired posts, inactive accounts)
- Instagram API compliance monitoring

---

### 13. Success Metrics

#### 13.1 Key Performance Indicators

- User registration rate
- Post creation rate
- Payment conversion rate
- Instagram cross-post success rate
- Average post visibility duration
- User engagement (likes, views)
- API response times
- System uptime

#### 13.2 Business Metrics

- Revenue from pricing tiers
- User retention rate
- Average posts per user
- Mobile money payment success rate
