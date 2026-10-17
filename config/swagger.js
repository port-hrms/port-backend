const swaggerJSDoc = require("swagger-jsdoc");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "HRFlow API",
      version: "1.0.0",
      description: "API documentation for HRFlow system",
    },
    servers: [
      {
        url: "https://nebolla.com",
      },
    ],


    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },


    security: [
      {
        bearerAuth: [],
      },
    ],
  },


  apis: [path.resolve(__dirname, "../routes/*.js")],
};



const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;