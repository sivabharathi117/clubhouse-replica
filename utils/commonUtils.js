const jwt = require('jsonwebtoken');
const fast2sms = require("fast-two-sms");

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

function handleErrorResponse(res, code, error) {
    const errorData = {
        status: "failure",
        code,
        error
    }
    res.status(code).send(errorData);
}

function handleSuccessResponse(res, code, data = {}, message = "Success") {
    const successData = {
        status: "success",
        code,
        message,
        data
    }
    res.status(code).send(successData);
}

async function sendSMS(message, mobileNo) {
    try {
        return await fast2sms.sendMessage({
            authorization: process.env.FAST2SMS,
            message,
            numbers: mobileNo,
        });
    } catch (e) {
        throw new Error(e)
    }

}

module.exports = { verifyJwt, handleErrorResponse, handleSuccessResponse, sendSMS };