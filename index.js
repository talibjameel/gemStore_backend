const express = require("express");
const app = express();
require("dotenv").config();
const signupRoute = require("./Auth/SignUp");
const loginRoute = require("./Auth/Login");
const forgotPasswordRoute = require("./Auth/ForgotPassword");
const updatePasswordRoute = require("./Auth/ForgotPassword");
const categoriesRoute = require("./Products/categories");
const uploadRoute = require("./Bucket_S3/bucket_s3");
const productsRoute = require("./Products/products");
const bannerRoute = require("./Products/banner");
const cartRoute = require("./Products/cart");
const myOrderRoute = require("./Products/my_order");

app.use(express.json());

// ✅ Connect routes
app.use("/", signupRoute);
app.use("/", loginRoute);
app.use("/", forgotPasswordRoute);
app.use("/", updatePasswordRoute);
app.use("/", categoriesRoute);
app.use("/", uploadRoute);
app.use("/", productsRoute);
app.use("/", bannerRoute);
app.use("/", cartRoute);
app.use("/", myOrderRoute);

app.get("/", (req, res) => {
  res.send("Welcome to my Node.js + PostGreSQL backend 🚀");
});



app.listen(process.env.PORT, () => {
  console.log(`✅ Server running at http://localhost:${process.env.PORT}/`);
});
