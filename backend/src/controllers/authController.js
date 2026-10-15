import jwt from "jsonwebtoken";
import User from "../models/User.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueToken(res, userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

export const register = async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (
    typeof fullName !== "string" || !fullName.trim() ||
    typeof email !== "string" || !EMAIL_RE.test(email.trim()) ||
    typeof password !== "string" || password.length < 8 ||
    password !== confirmPassword
  ) {
    return res.status(400).json({ success: false, message: "Invalid registration details." });
  }

  try {
    const user = await User.create({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });

    const token = issueToken(res, user._id);

    return res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    console.error("Register error:", error.message);
    return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const token = issueToken(res, user._id);

    return res.json({
      success: true,
      token,
      user: { _id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

export const me = (req, res) => {
  return res.json({ success: true, user: req.user });
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });
  return res.json({ success: true, message: "Logged out." });
};
