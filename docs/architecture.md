# Inventory Management System – Architecture
1. Overview

The Inventory Management System (IMS) is a full-stack web application designed to manage inventory records efficiently while maintaining secure user access. The system allows administrators and authorized users to manage inventory items, control user roles, and monitor system activities through a structured interface.

The application follows a three-layer architecture consisting of:

Frontend Layer (User Interface)

Backend Layer (Application Logic & APIs)

Database Layer (Data Storage & Management)

This architecture ensures modular development, easy scalability, and clear separation of responsibilities.

2. System Architecture
User Interface (Frontend)
        ↓
REST API Requests
        ↓
Backend Server (Application Logic)
        ↓
Database (Persistent Storage)
Workflow

The user interacts with the frontend interface through a browser.

The frontend sends API requests to the backend server.

The backend processes requests, performs business logic, and validates inputs.

The backend communicates with the database to store or retrieve data.

The processed data is returned to the frontend and displayed to the user.

3. Frontend Layer

The frontend is responsible for presenting the user interface and enabling user interaction with the system.

Responsibilities

Display inventory data

Provide forms for adding or updating items

Handle user authentication inputs

Send API requests to the backend

Show system responses and status messages

Technologies

HTML

CSS

JavaScript

Key Features

Clean and simple user interface

Navigation between inventory views and management pages

Input validation before sending data to the backend

4. Backend Layer

The backend server manages the application logic and handles communication between the frontend and the database.

Responsibilities

Handle API requests from the frontend

Perform validation and error handling

Implement business logic for inventory operations

Manage user authentication and authorization

Process role-based access control

Core Functions

Add inventory items

Update inventory details

Delete items

Retrieve inventory data

Manage user roles

Handle password recovery with OTP verification

Technologies

Node.js

Express.js

5. Database Layer

The database stores all persistent data used by the system.

Responsibilities

Store inventory item records

Store user account details

Store user role information

Maintain system consistency and data integrity

Stored Data

Examples of stored entities:

Inventory Items

Item ID

Item Name

Quantity

Category

Last Updated

User Accounts

User ID

Username

Password (secured)

Role (Admin / Manager / User)

Technology

postgresql Database

6. Security & Access Control

The system implements Role-Based Access Control (RBAC).

User Roles

Admin

Full system access

Manage inventory

Edit or delete users

Change user roles

Manager

Add and update inventory items

Limited administrative permissions

User

View inventory data

Restricted modification access

This ensures controlled and secure system usage.

7. Additional System Features
Password Recovery System

The system provides a Forgot Password mechanism with OTP verification.

Process:

User selects Forgot Password
→ Enters registered email
→ OTP is generated and sent
→ User verifies OTP
→ User sets new password
Admin User Management

Administrators can:

Edit user information

Delete user accounts

Change user roles dynamically

This allows centralized control of system access.

8. Team Structure and Responsibilities

The project was developed collaboratively with clearly defined roles to ensure efficient development and coordination.

Team Leader

Responsibilities:

Project integration

Documentation preparation

System testing

Debugging and issue resolution

Ensuring overall system functionality

Member 2 – Backend Developer

Responsibilities:

Development of server logic

Implementation of APIs

Handling authentication and authorization

Managing communication between frontend and database

Member 3 – Frontend Developer

Responsibilities:

Designing the user interface

Implementing UI pages

Handling client-side validation

Connecting frontend with backend APIs

Member 4 – Database Developer

Responsibilities:

Designing the database schema

Managing database queries

Ensuring data consistency and structure

Supporting backend integration

9. Benefits of the Architecture

The chosen architecture provides several advantages:

Clear separation of system components

Improved maintainability

Scalability for future enhancements

Secure role-based system access

Efficient collaboration between development team members

10. Future Improvements

Potential future enhancements include:

Real-time inventory tracking

Automated inventory alerts

Advanced analytics dashboard

Integration with external inventory systems

Enhanced authentication mechanisms

Conclusion

The Inventory Management System is designed with a modular architecture that ensures reliability, security, and ease of maintenance. By combining structured backend logic, an intuitive frontend interface, and a robust database system, the application provides an efficient solution for managing inventory while maintaining secure user access and administrative control.