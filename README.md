# Center Solution Book

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Folder Structure](#folder-structure)
5. [API Documentation](#api-documentation)


## Overview

The center solution system is designed to manage various aspects of a service center with multiple branches. It includes features for online registration, employee management, service offerings, reservations, and user management. The system also incorporates privilege levels to ensure secure access control.

## Features

The project is organized into the following main directories:

- **Center Registration:** Allows for the registration and management of different centers within the system.
- **Branches** 
- **Employee Management: Handles employee roles and assignments.
- **Customer Capacity: Manages the number of customers that can be accommodated per day at each branch.
- **Appointment Scheduling: Allows customers to book appointments at specific branches.
- **Branch Address Management: Stores and manages the addresses of all branches.

- **Employee Roles:** 
- **Accountant: Manages financial transactions and records.
- **Technical Director: Oversees technical operations and services.
- **Artist: Provides artistic services.
- **Offline Receptionist: Handles in-person customer interactions and appointments.
- **Admin: Manages overall system administration.
- **Online Coordinator: Manages online customer interactions and coordination.

- **Service Management:** 
- **Service Details: Includes the service name, price, coordinator, rate, duration, and display status.

- **Reservation** 
- **Branch Selection: Customers can choose a branch for their reservation.
- **Reservation Status: Tracks the status of reservations (e.g., pending, canceled, completed).
- **Service Notes: Allows for notes related to the service being reserved.
- **Receipt Photo: Upload and manage photos of payment receipts.
- **Advance Payment: Tracks the amount paid in advance by the customer.
- **Customer Information: Stores customer details such as name and contact information.
- **Total Price: Calculates and stores the total price of the reservation.
- **Reservation Number: Generates a unique number for each reservation.
- **Login Time & Date: Tracks the time and date of the reservation.
- **Services: Lists the services included in the reservation.
- **Employee Assignment: Tracks which employee is responsible for the reservation.

- **Status Reservation** 
- **Pending: Reservation is awaiting confirmation.
- **Canceled: Reservation has been canceled.
- **Completed: Service has been completed.
- **Done or Not: Tracks whether the service was successfully completed or not.

## Folder Structure
```
{
src/
│
├── auth/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   ├── dto/
│   │   ├── login.dto.ts
│   ├── entities/
│   │   └── auth.entity.ts
│   └── strategies/
│       └── jwt.strategy.ts
│
├── branch/
│   ├── branch.controller.ts
│   ├── branch.module.ts
│   ├── branch.service.ts
│   ├── dto/
│   │   ├── create-branch.dto.ts
│   │   ├── update-branch.dto.ts
│   ├── entities/
│   │   └── branch.entity.ts
│   └── single-branch.controller.ts
│
├── employee/
│   ├── employee.controller.ts
│   ├── employee.module.ts
│   ├── employee.service.ts
│   ├── dto/
│   │   ├── create-employee.dto.ts
│   │   ├── update-employee.dto.ts
│   ├── entities/
│   │   └── employee.entity.ts
│   ├── employee-types.controller.ts
│   └── position-titles.controller.ts
│
├── client/
│   ├── client.controller.ts
│   ├── client.module.ts
│   ├── client.service.ts
│   ├── dto/
│   │   ├── create-client.dto.ts
│   │   ├── update-client.dto.ts
│   ├── entities/
│   │   └── client.entity.ts
│
├── service/
│   ├── service.controller.ts
│   ├── service.module.ts
│   ├── service.service.ts
│   ├── dto/
│   │   ├── create-service.dto.ts
│   │   ├── update-service.dto.ts
│   ├── entities/
│   │   └── service.entity.ts
│
├── reservation/
│   ├── reservation.controller.ts
│   ├── reservation.module.ts
│   ├── reservation.service.ts
│   ├── dto/
│   │   ├── create-reservation.dto.ts
│   │   ├── update-reservation.dto.ts
│   ├── entities/
│   │   └── reservation.entity.ts
│   ├── reservation-client.controller.ts
│   └── reservation-receipt.controller.ts
│
├── artist/
│   ├── artist.controller.ts
│   ├── artist.module.ts
│   ├── artist.service.ts
│   ├── dto/
│   │   ├── create-artist.dto.ts
│   │   ├── update-artist.dto.ts
│   ├── entities/
│   │   └── artist.entity.ts
│
├── timeframe/
│   ├── timeframe.controller.ts
│   ├── timeframe.module.ts
│   ├── timeframe.service.ts
│   ├── dto/
│   │   ├── create-timeframe.dto.ts
│   │   ├── update-timeframe.dto.ts
│   ├── entities/
│   │   └── timeframe.entity.ts
│
├── dashboard/
│   ├── financial-dashboard.controller.ts
│   ├── admin-dashboard.controller.ts
│   ├── dashboard.module.ts
│   ├── dashboard.service.ts
│   ├── dto/
│   │   ├── financial-dashboard.dto.ts
│   │   ├── admin-dashboard.dto.ts
│   ├── entities/
│   │   └── dashboard.entity.ts
│
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
│       ├── appError.ts
│       └── helperFunctions.ts
│
├── app.module.ts
├── main.ts
├── config/
│   ├── config.module.ts
│   ├── config.service.ts
│   └── configuration.ts
├── database/
│   ├── database.module.ts
│   ├── database.providers.ts
│   └── migrations/
│       └── <timestamp>-migration-name.ts
└── shared/
    ├── dto/
    ├── entities/
    └── interfaces/
}
```
