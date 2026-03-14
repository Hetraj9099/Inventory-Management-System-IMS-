Inventory Management System (IMS)
Overview

The Inventory Management System (IMS) is a web-based application designed to help organizations efficiently manage their inventory, track stock levels, and monitor inventory operations in real time.

The system allows administrators and authorized users to manage products, warehouses, deliveries, transfers, and other inventory operations through an intuitive dashboard.

The project follows a full-stack architecture with a structured backend, interactive frontend, and a PostgreSQL database for reliable data storage.

Key Features
Inventory Management

Add new products to the inventory

Update product details

Remove products when necessary

Track stock quantities

Warehouse Management

Manage multiple warehouses

Monitor stock distribution across warehouses

Delivery & Transfer Tracking

Manage outbound deliveries

Track stock transfers between warehouses

Maintain operation history

Dashboard & Analytics

View key inventory data through the dashboard

Monitor system activity and stock flow

Security Features
Role-Based Access Control

The system provides three user roles with different permissions.

Admin

Full system access

Manage users

Change user roles

Edit or delete any user

Manage inventory and system settings

Manager

Manage inventory operations

Update product and stock data

Limited administrative privileges

User

View inventory information

Restricted editing access

Password Recovery System

The system includes a Forgot Password feature with OTP verification.

Workflow:

User requests password reset
→ System sends OTP
→ User verifies OTP
→ User sets new password

This ensures secure account recovery.

System Architecture

The application follows a three-layer architecture:

Frontend (User Interface)
        ↓
Backend API Server
        ↓
PostgreSQL Database
Frontend

Handles user interaction and displays system data.

Technologies used:

HTML

CSS

JavaScript

Backend

Manages business logic and API endpoints.

Technologies used:

Node.js

Express.js

Database

Stores persistent data and manages relationships.

Technology used:

PostgreSQL

Project Structure
coreinventory
│
├── backend
│   ├── controllers
│   ├── models
│   ├── services
│   ├── middleware
│   ├── utils
│   └── server.js
│
├── frontend
│   ├── components
│   ├── css
│   ├── js
│   └── html pages
│
├── database
│   └── seed.sql
│
└── docs
    └── architecture.md
How to Run the Project
1. Clone the repository
git clone https://github.com/Hetraj9099/Inventory-Management-System-IMS-.git
2. Navigate into the project
cd coreinventory
3. Install dependencies
npm install
4. Configure PostgreSQL database

Create a PostgreSQL database and update the database configuration if required.

5. Run the backend server
node backend/server.js

Server will start at:

http://localhost:5000
Team Structure
Team Leader - Hetraj Chauhan

Responsibilities:

Project integration

Documentation

System testing

Debugging

Ensuring complete system functionality

Member 2 Vicky Goplani — Backend Developer

Responsibilities:

Backend server development

API implementation

Authentication and authorization

Business logic handling

Member 3 Raj Sinha — Frontend Developer

Responsibilities:

User interface design

Frontend logic implementation

API integration with backend

Member 4 Paritosh Patel — Database Developer

Responsibilities:

Database schema design

Query optimization

Data management and integrity

Future Improvements

Possible future enhancements include:

Automated stock alerts

Advanced analytics dashboard

Barcode or QR inventory scanning

Cloud deployment

Conclusion

The Inventory Management System provides a structured and scalable solution for managing inventory operations. With role-based access control, secure authentication mechanisms, and a robust architecture, the system ensures efficient and secure inventory management.
