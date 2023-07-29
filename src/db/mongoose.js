const mongoose = require("mongoose");

const mongoURL = process.env.MONGODB_URL;

mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

mongoose.set("returnOriginal", false);
