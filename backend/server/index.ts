import './common/env';
import Server from './common/server';
import routes from './routes';
import sockets from './sockets';

const port = parseInt(process.env.PORT);
export default new Server().router(routes).socket(sockets).listen(port);
