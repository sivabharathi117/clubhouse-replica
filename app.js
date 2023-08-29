var express = require("express");
const router = require("./routes/router");
var app = express();
const port = 3000;
var cors = require('cors');

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
