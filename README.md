# s2

s2 is a modern, full-stack web application designed to let users upload, share, and view videos online. Inspired by popular video hosting services, s2 provides a streamlined experience for both content creators and viewers. The platform features user authentication, video uploads, public video listings, and individual video pages with view tracking and user interactions.

Built with Next.js and leveraging Supabase for backend services, s2 offers a responsive and accessible user interface, including dark mode support. The application is designed for flexible deployment to a variety of hosting providers, including serverless platforms like Cloudflare Workers (via Wrangler), Vercel, and Netlify, making it scalable and cost-effective.

Key highlights:
- **User Authentication:** Secure sign up and sign in, with user context management.
- **Video Upload & Sharing:** Users can upload videos, which are then available for public viewing.
- **Video Viewing:** Each video has a dedicated page with metadata, view count, and related videos.
- **Video Interactions:** Users can interact with videos through features such as view tracking, and (optionally) comments, likes, or sharing, depending on implementation.
- **Public Video Listing:** Browse and discover videos uploaded by other users.
- **Responsive UI:** Clean, modern design with support for light and dark themes.
- **Flexible Hosting:** Easily deploy to Cloudflare Workers, Vercel, Netlify, or other modern hosting providers.

s2 is ideal for developers looking to learn about building scalable video platforms, or for anyone wanting to launch a simple, customizable video sharing site.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Core Features](#core-features)
- [Key Components](#key-components)
- [Styling](#styling)
- [Authentication](#authentication)
- [Video Pages](#video-pages)
- [Cloudflare & Wrangler Support](#cloudflare--wrangler-support)
- [Configuration Files](#configuration-files)
- [License](#license)

---

## Project Structure

```
.env
.gitignore
bun.lock
components.json
next-env.d.ts
next.config.ts
open-next.config.ts
package.json
postcss.config.mjs
README.md
tsconfig.json
wrangler.json
.next/
.open-next/
.vscode/
.wrangler/
public/
src/
```

- **.env**: Environment variables.
- **.next/**: Next.js build output.
- **public/**: Static assets.
- **src/**: Application source code.

---

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Run the development server:**
   ```sh
   npm run dev
   ```
3. **Build for production:**
   ```sh
   npm run build
   ```

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase_anon_key>
NEXT_PUBLIC_SCHEMA=<schema_name>
NEXT_PUBLIC_PROFILE=<url_api>
```

Fill in the values according to your environment and service providers.

---

## Scripts

- `npm run dev`: Start the development server.
- `npm run build`: Build the application for production.
- `npm run start`: Start the production server.

---

## Core Features

- User authentication (sign up, sign in)
- Video upload and sharing
- Video viewing with view count tracking
- Public video listing
- Responsive UI with dark mode support

---

## Key Components

### Authentication

- `SignupPage`: Handles user registration using form inputs and authentication context.
- Uses `useAuth` for authentication logic.

### Video Pages

- `/video/[videoId]/page.jsx`: 
  - Fetches video data and metadata.
  - Increments view count on each visit.
  - Renders video details and related public videos.
  - Handles not-found and error states.

### UI Components

- Located in `src/components/ui/`
  - `Button`, `Input`, `Label`, `Card`, `Separator`, etc.
- `ModeToggle`: Switches between light and dark mode.

---

## Styling

- Global styles in `src/app/globals.css`
  - Uses CSS custom properties for theme colors.
  - Integrates Tailwind CSS and custom animation utilities.
- Theme variables for sidebar, charts, and backgrounds.

---

## Authentication

- Context-based authentication via `useAuth`.
- Signup and login pages under `src/app/auth/`.

---

## Video Pages

- Dynamic routing for videos: `/video/[videoId]`
- Metadata generation for SEO.
- View count updates using Supabase.

---

## Cloudflare & Wrangler Support

This project supports deployment to [Cloudflare Workers](https://developers.cloudflare.com/workers/) using [Wrangler](https://developers.cloudflare.com/wrangler/).

- **wrangler.json**: Contains configuration for deploying to Cloudflare Workers.
- **open-next.config.ts**: Supports OpenNext deployment for serverless environments.
- To deploy:
  1. Install Wrangler CLI:  
     ```sh
     npm install -g wrangler
     ```
  2. Authenticate with Cloudflare:  
     ```sh
     wrangler login
     ```
  3. Build and deploy:  
     ```sh
     npm run cf:build
     wrangler publish
     ```

---

## Configuration Files

- **next.config.ts**: Next.js configuration.
- **open-next.config.ts**: Open Next.js deployment configuration.
- **tsconfig.json**: TypeScript configuration.
- **postcss.config.mjs**: PostCSS configuration.
- **wrangler.json**: Cloudflare Workers configuration.

---

## Authors

<a href="https://github.com/daulric/s2/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=daulric/s2" alt="Contributors" />
</a>