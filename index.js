const express = require("express");
const app = express();
require("dotenv").config();
const signupRoute = require("./Auth/SignUp");
const loginRoute = require("./Auth/Login");
const forgotPasswordRoute = require("./Auth/ForgotPassword");
const updatePasswordRoute = require("./Auth/ForgotPassword");
const categoriesRoute = require("./Products/categories");
const uploadRoute = require("./Integrations_3rd_Apps/AWS_S3");
const productsRoute = require("./Products/products");

app.use(express.json());

// ✅ Connect routes
app.use("/", signupRoute);
app.use("/", loginRoute);
app.use("/", forgotPasswordRoute);
app.use("/", updatePasswordRoute);
app.use("/", categoriesRoute);
app.use("/", uploadRoute);
app.use("/", productsRoute);

app.get("/", (req, res) => {
  res.send("Welcome to my Node.js + PostGreSQL backend 🚀");
});





app.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
