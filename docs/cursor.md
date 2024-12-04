# Project Context for Cursor AI

## Project Overview

This is a data collection web application. With this application, there will be two roles. Assigner and assignee. Based on the role, in short, the assigner will assign tasks to the assignee and the assignee will complete the assigned tasks.

Assigner:

- Assign tasks to the assignee
- View all tasks
- View all assignees
- View all statistics

Assignee:

- View assigned tasks
- View task details
- Complete task
- View assigned tasks statistics

A task will be assigned for data collection for ai model training. When an assignee presses on a task,
based on the business logic behind, he will see the details of the task. When he completes the task, and presses on submit button, the data will be sent to the database.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Shadcn/ui
- NextAuth
- Firebase

## Key Patterns & Conventions

- Using 'use client' for client components
- Following atomic design for components
- File-based routing with Next.js
- [Other important patterns]

## Component Structure Example

## Project Structure

app/
├── (auth)/ # Authentication group
│ ├── (signin)/ # Sign in routes
│ │ └── page.tsx # Sign in page
│ └── components/ # Shared auth components
│ ├── github-auth-button.tsx
│ ├── sigin-view.tsx
│ └── user-auth-form.tsx
├── api/ # API routes
│ └── auth/ # Auth API endpoints
├── dashboard/ # Dashboard routes
│ ├── assign-tasks/ # Task assignment feature
│ │ ├── [productId]/ # Dynamic product routes
│ │ └── components/ # Task-related components
│ ├── kanban/ # Kanban board feature
│ │ └── components/ # Kanban-related components
│ ├── overview/ # Dashboard overview
│ │ └── components/ # Overview components
│ └── layout.tsx # Dashboard layout
└── layout.tsx # Root layout

## Key Patterns:

Route Groups: (auth), (signin) for logical grouping
Shared Components: components/ for feature-specific components
Dynamic Routes: [productId] for parameter-based routing
API Routes: api/ directory for backend endpoints
Feature-based Organization: Each major feature has its own directory
