var express = require("express");
const router = require("./routes/router");
var app = express();
var cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 3000;
console.log(port);
const peers = require('./webRtc/peers');

app.use(cors());
app.use(express.json());
app.use('/api', router);

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
peers(server);
