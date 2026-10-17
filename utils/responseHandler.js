// @ts-nocheck

const sendSuccess = (res, data = {}, message = "Success", statusCode = 200) => {
  const response = { success: true, message };

  // If data is an array, include count
  if (Array.isArray(data)) {
    response.count = data.length;
    response.data  = data;
  } else if (data && Object.keys(data).length > 0) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const sendError = (res, message = "Something went wrong", statusCode = 500, error = null) => {
  const response = { success: false, message };
  if (error && process.env.NODE_ENV === "development") {
    response.error = error; // only expose raw error in dev
  }
  return res.status(statusCode).json(response);
};

const sendNotFound = (res, resource = "Resource") => {
  return sendError(res, `${resource} not found`, 404);
};

const sendBadRequest = (res, message) => {
  return sendError(res, message, 400);
};

module.exports = { sendSuccess, sendError, sendNotFound, sendBadRequest };