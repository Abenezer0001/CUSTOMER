# InSeat Menu Application

This is a menu application for the InSeat platform, allowing customers to browse and order food and drinks.

## Prerequisites

- Node.js 16+ and npm
- MongoDB running locally or a connection to a MongoDB instance

## Setup

1. Clone the repository
2. Install dependencies
```bash
npm install
```
3. Create a `.env` file with the following variables:
```
MONGO_URL=mongodb://localhost:27017/inseat
```

## Development

Run the development server:
```bash
npm run dev
```

## Seeding the Database

To populate your database with categories, subcategories, and menu items, run the seed script:
```bash
npm run seed
```

This will:
1. Connect to your MongoDB database
2. Create 8 categories (Food, Drinks, Wine, Cocktails, etc.)
3. Create subcategories for each category
4. Create menu items for each subcategory

If you need to customize the seed data, edit the `src/seed-data.js` file.

## Building for Production

```bash
npm run build
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run seed` - Seed the database with sample data

# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/86a93476-b505-4394-a35e-278a8e1c7dbb

## How can I edit this code???

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/86a93476-b505-4394-a35e-278a8e1c7dbb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- other libraries

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/86a93476-b505-4394-a35e-278a8e1c7dbb) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
# Trigger deployment test Wed Jul 23 01:02:17 PM +04 2025
# Test deployment at Wed Jul 23 01:14:15 PM +04 2025
