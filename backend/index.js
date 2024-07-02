const { RateLimiterMemory } = require("rate-limiter-flexible");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const handlebars = require("handlebars");
const path = require("path");
const logger = require("./middlewares/logger");
const nodemailer = require("nodemailer");
const cron = require("node-cron");
require("dotenv").config();

const app = express();

let template;
try {
  const templatePath = path.join(__dirname, "emailTemplate.hbs");
  const templateSource = fs.readFileSync(templatePath, "utf8");
  template = handlebars.compile(templateSource);
} catch (error) {
  console.error("Error reading or compiling the template:", error);
}

app.use(cors());
app.use(express.json());
app.use(logger);

const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60 * 15,
});

// Set up nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

app.get("/health", (req, res) => {
  return res.send("Health is okay");
});

app.post("/send-email", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "Please fill all the fields",
    });
  }

  const emailData = { name, email, message };
  const emailHtml = template(emailData);

  const ip = req.headers["x-forwarded-for"] || req.ip;

  rateLimiter
    .consume(ip, 1)
    .then(() => {
      console.log(`Rate limit success for ${ip}`);

      const mailOptions = {
        from: "Pranay-Portfolio <onboarding@resend.dev>",
        to: "pmcanvas4501@gmail.com",
        subject: "New Portfolio Connect",
        html: emailHtml,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return res.status(500).json({
            success: false,
            message: error.message,
          });
        } else {
          return res.status(200).json({
            success: true,
            message: "Email sent successfully",
            data: info.response,
          });
        }
      });
    })
    .catch((rateLimitError) => {
      return res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

const job = cron.schedule("*/14 * * * *", () => {
  console.log("Running a task every 14 minutes");
  fetch(`${process.env.BACKEND_HOSTED_URL}/health`)
    .then(() => {
      console.log("Health Check Passed");
    })
    .catch((err) => {
      console.error("Health Check Failed", err);
    });
});

job.start();

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
