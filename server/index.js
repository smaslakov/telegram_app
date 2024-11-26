import { startServer } from './server.js';
import { startBot } from './bot.js';
import { pool } from './database.js';


startServer();

startBot();

pool.getConnection((err, connection) => {
   if (err) {
      console.log('Ошибка подключения к БД: ', err);
   } else {
      console.log("DB connected");
      connection.release();
   }
});
