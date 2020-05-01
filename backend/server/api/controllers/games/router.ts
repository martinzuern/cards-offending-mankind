import express from 'express';
import controller from './controller';
export default express
  .Router()
  .post('/', controller.createGame)
  .get('/:id', controller.byId)
  .post('/:id/join', controller.joinGame);
