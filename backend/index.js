const { RateLimiterMemory } = require("rate-limiter-flexible");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const handlebars = require("handlebars");
const path = require("path");
const logger = require("./middlewares/logger");
const { Resend } = require("resend");
require("dotenv").config();

const app = express();

// Read the Handlebars template
const templatePath = path.join(__dirname, "emailTemplate.hbs");
const templateSource = fs.readFileSync(templatePath, "utf8");

// Compile the template
const template = handlebars.compile(templateSource);

app.use(cors());
app.use(express.json());
app.use(logger);

const rateLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 60 * 24,
});

app.post("/send-email", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the fields",
      });
    }
    // Render the template with the dynamic data
    const emailData = { name, email, message };
    const emailHtml = template(emailData);

    await rateLimiter.consume(req.ip, 1);
    console.log(`Rate limit success for ${req.ip}`);
    const resend = new Resend(process.env.RESEND_API);

    try {
      let response = await resend.emails.send({
        from: "Pranay-Portfolio <onboarding@resend.dev>",
        to: ["pmcanvas4501@gmail.com"],
        subject: "New Portfolio Connect",
        html: emailHtml,
        headers: {
          "X-Entity-Ref-ID": "123456789",
        },
        tags: [
          {
            name: "contact",
            value: "contact_email",
          },
        ],
      });

      if (response.error) {
        return res.status(400).json({
          success: false,
          message: response.error.message,
        });
      }
      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
        data: response,
      });
    } catch (emailError) {
      return res
        .status(500)
        .json({ success: false, message: emailError.message });
    }
  } catch (rateLimitError) {
    return res
      .status(429)
      .json({ success: false, message: "Too many requests" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
