import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();
console.log("JWT_SECRET:", process.env.JWT_SECRET);

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  try {
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "This Email is already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
      email,
      hashedPassword,
    ]);

    await sendConfirmationEmail(email);

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("error during signup:", error.message);
    res.status(500).json({ error: "Internal server error. Please try again" });
  }
});

const sendConfirmationEmail = async (email) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to CryptoGreek",
    text: "Thank you for signing up. We're excited to have you on board!",
  };
  await transporter.sendMail(mailOptions);
};

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt:", email);

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token =jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET, // stores this key safely in .env file
      { expiresIn: "1h" } // token expiration time
    );

    res.json({ message: "Login successful!", token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }

});

export default router;
