
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  })
);

app.use(express.json());

// APIs -----------------------------

app.use("/api/github-analytics", require("./routes/githubRoutes"));
app.use("/api/repositories", require("./routes/repositoryRoutes"));
app.use("/api/favourites", require("./routes/favouriteRoutes"));

// APIs -----------------------------

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GitHub Analytics API is running",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
