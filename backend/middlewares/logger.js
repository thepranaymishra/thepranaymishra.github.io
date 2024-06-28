const logger = (req, res, next) => {
  let color;
  switch (req.method) {
    case "GET":
      color = "\x1b[32m"; // Green
      break;
    case "POST":
      color = "\x1b[34m"; // Blue
      break;
    case "PATCH":
      color = "\x1b[33m"; // Yellow
      break;
    case "DELETE":
      color = "\x1b[31m"; // Red
      break;
    default:
      color = "\x1b[0m"; // Reset color
      break;
  }

  console.log(`${color}${req.method}\x1b[0m ${req.originalUrl} ${new Date()}`);
  next();
};

module.exports = logger;
