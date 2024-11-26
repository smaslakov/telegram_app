import mysql from 'mysql2';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
export const pool = mysql.createPool({
    host:process.env.DB_HOST,
    port:process.env.DB_PORT,
    database:process.env.DB_NAME,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
});
export const addStory = (userId,photoPath,longitude,latitude,description) => {
    pool.query('INSERT INTO STORIES (UserId,PhotoPath,Longitude,Latitude,Description) VALUES (?,?,?,?,?)',[userId,photoPath,longitude,latitude,description], (err) => {
        if (err) {
            console.log('Ошибка при добавлении истории: ', err);
        } else {
            console.log(`История добавлена в базу данных`);
        }
    });
}
export const isUserInDB = (userId) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM USERS WHERE TelegramID = ?', [userId], (err, results) => {
            if (err) {
                console.log('Ошибка при получении данных пользователя: ', err);
                reject(false);
            } else {
                resolve(results.length !== 0);
            }
        });
    });
}
export const insertUserInDB = (userId,username,chatId) => {
    pool.query('INSERT INTO USERS (TelegramID,Username,ChatId) VALUES (?,?,?)',[userId,username,chatId], (err) => {
        if(err){
            console.log('Ошибка при добавлении пользователя: ', err);
        }else{
            console.log(`Пользователь ${userId} добавлен в базу данных`);
        }
    });
}
export const getChatId = (userId) => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT ChatId FROM USERS WHERE TelegramID = ?', [userId], (err, results) => {
            if (err) {
                console.log('Ошибка при получении ChatId: ', err);
                reject(err);
            } else {
                resolve(results[0].ChatId);
            }
        });
    });
}
export const addFriendForUser = (userId,FriendId) => {
    pool.query('INSERT INTO UserRelationships (userId,FriendId) VALUES (?,?)',[userId,FriendId], (err) => {
        if(err){
            console.log('Ошибка при добавлении друга: ', err);
        }else{
            console.log(`Друг ${FriendId} добавлен для ${userId} в базу данных`);
        }
    });
}

export const getAllStories = () => {
    return new Promise((resolve, reject) => {
        pool.query('SELECT * FROM Stories', (err, results) => {
            if (err) {
                console.log('Ошибка при получении историй: ', err);
                reject(err)
            } else {
                resolve(results)
            }
        });
    });
}