import express from 'express';
import controller from './controller';
import { wrapAsync } from '../../middlewares/error.handler';
export default express
  .Router()
  .post('/', wrapAsync(controller.createGame))
  .get('/:id', wrapAsync(controller.byId))
  .post('/:id/join', wrapAsync(controller.joinGame));
