const express = require("express");
const router = require("./routes/router");
const app = express();
const cors = require('cors');
require('dotenv').config();
const morgan = require('morgan');
const port = process.env.PORT || 3001;
const bodyParser = require('body-parser');
const peers = require('./webRtc/peers');

app.use(cors());
app.use(morgan('short'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', router);

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
peers(server);
