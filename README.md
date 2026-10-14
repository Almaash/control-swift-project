# GitHub Repository Analytics Dashboard

A full-stack application to search public GitHub repositories, explore repository statistics, view recent commits and contributors, and manage favourite repositories.

## Features

- Search public GitHub repositories by keyword
- View stars, forks, programming language, and last update
- Sort results by stars or recent updates
- Paginate through search results
- View repository details, latest five commits, top five contributors, and open issue count
- Save and remove favourite repositories
- Prevent duplicate favourites
- Handle GitHub API errors and rate limits
- Cache repository search results for five minutes

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express.js, Axios
- **Database:** MongoDB with Mongoose
- **External API:** GitHub REST API

## Prerequisites

- Node.js and npm
- MongoDB Atlas account or a local MongoDB instance
- GitHub personal access token (optional, but recommended)

## Setup

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd github-analytics
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file based on `.env.example` and configure:

```dotenv
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
GITHUB_TOKEN=your_github_token
```

### 3. Start the backend

```bash
npm run dev
```

The backend runs at `http://localhost:5000`.

### 4. Configure the frontend

Open a second terminal:

```bash
cd client
npm install
```

Create `client/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 5. Start the frontend

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/github/search?q=react` | Search repositories |
| GET | `/api/repositories/:owner/:repo` | Get repository details |
| GET | `/api/favourites` | List favourites |
| GET | `/api/favourites/:githubRepoId` | Check favourite status |
| POST | `/api/favourites` | Save a favourite |
| DELETE | `/api/favourites/:githubRepoId` | Remove a favourite |

## Environment Variables

See `backend/.env.example` and `client/.env.example`.

Never commit real API tokens, database credentials, or `.env` files.

## Notes

- Search caching is in-memory and expires after five minutes.
- Favourite repositories are stored in MongoDB.
- Configure CORS and environment variables appropriately before deployment.
