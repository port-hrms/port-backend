// @ts-nocheck

const validateCreateJobInput = (req, res, next) => {
  const { title, department, location, description } = req.body;

  if (!title || !department || !location || !description) {
    return res.status(400).json({
      success: false,
      message: "Title, department, location and description are required",
    });
  }

  next();
};

module.exports = {
  validateCreateJobInput,
};
