const jwt = require('jsonwebtoken');

function verifyJwt(token) {
    if (token) {
        return jwt.verify(token, process.env.jwtSecretKey, (err, decoded) => {
            if (err) {
                return false;
            } else {
                return decoded;
            }
        });
    }
    return false;
}

module.exports = { verifyJwt };