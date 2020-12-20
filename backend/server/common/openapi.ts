import * as path from 'path';
import express, { Application } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';

export default function (app: Application): void {
  const apiSpec = path.join(__dirname, 'api.yml');

  app.use(OpenApiValidator.middleware({ apiSpec, validateResponses: true }));
  app.use(process.env.OPENAPI_SPEC || '/spec', express.static(apiSpec));
}
