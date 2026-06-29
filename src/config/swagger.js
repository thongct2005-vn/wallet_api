const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Wallet API Documentation',
      version: '1.0.0',
      description: 'Tài liệu API cho hệ thống Ví điện tử',
    },
    servers: [
      {
        url: 'http://localhost:8000', 
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {

        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API Key cấp riêng cho từng Đối tác (Merchant)',
        },
      },
    },
  },

  apis: [
    './src/docs/swagger/*.js',
    './src/modules/**/*.routes.js'
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;