import {Bot,Keyboard,InlineKeyboard} from 'grammy';
import {addStory, getChatId, insertUserInDB, isUserInDB,addFriendForUser} from "./database.js";
import fetch, { FormData } from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import mysql from "mysql2";

const bot = new Bot(process.env.BOT_TOKEN);

bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'hello', description: 'Say hello' },
    {command: 'addstory', description: 'Add Story '},
    {command: 'addfriend',description: 'Add Friend'},
    {command: 'cancel',description: 'Stop all commands'}
]);
const addFriendState = {
    addFriendActive : false
}
const addStoryState = {
    addStoryActive : false,
    longitude : undefined,
    latitude : undefined,
    fileId : undefined,
    description : undefined,
}
const resetUserState = (userId) => {
    addStoryState[userId].addStoryActive = false;
    addStoryState[userId].longitude = undefined;
    addStoryState[userId].latitude = undefined;
    addStoryState[userId].fileId = undefined;
    addStoryState[userId].description = undefined;
}
const isAddStoryFunctionGotAllData = (userId) => {
    const { longitude,latitude,fileId, description } = addStoryState[userId];
    return (longitude !== undefined && latitude !== undefined && fileId !== undefined && description !== undefined);
}
async function downloadFileInStorage(fileId,ctx,userId){
    const file = await ctx.api.getFile(fileId);
    const res = await fetch(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`)
    const formData = new FormData();
    const filename = `${Date.now()}_${file.file_path.split('/').pop()}`;

    const b = await res.blob();
    formData.set('file', b, filename)
    try {
        const request = await fetch('http://localhost:3001/upload', {
            method: 'POST',
            body: formData,
        });
        addStoryState[userId].fileId = `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${process.env.GCP_DIRECTORY_STORIES_NAME}/${filename}`;
    } catch (error) {
        console.log('Error uploading file:', error);
    }
}
const executeAddStory = (userId,ctx) => {
    addStory(userId, addStoryState[userId].fileId, addStoryState[userId].longitude, addStoryState[userId].latitude, addStoryState[userId].description);
    resetUserState(userId);
    ctx.reply("Story added successfully");
}

bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const username = ctx.from.username || ctx.from.first_name;
    const chatId = ctx.chat.id;
    if(await isUserInDB(userId)){
        console.log('Пользователь уже есть в базе данных');
    }else{
        insertUserInDB(userId,username,chatId);
    }
    await ctx.reply("Hello! I'm a bot that can help you to add stories to our map. Use /addstory to add your story");
});
bot.command('addstory', async (ctx) => {
    const userId = ctx.from.id;
    const keyboard = new Keyboard().requestLocation("Send location")
    await ctx.reply("Send me photo,description and location for ur story", {
        reply_markup: { keyboard: keyboard.build() }
    });
    addStoryState[ctx.from.id] = {
        addStoryActive: true,
        longitude: undefined,
        latitude: undefined,
        fileId: undefined,
        description: undefined,
    };
});
bot.on('message:photo', async (ctx) => {
    const userId = ctx.from.id;
    if(addStoryState[userId]?.addStoryActive) {
        const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        addStoryState[userId].fileId = fileId;
        if (isAddStoryFunctionGotAllData(userId)) {
            await downloadFileInStorage(addStoryState[userId].fileId, ctx, userId);
            executeAddStory(userId,ctx);
        } else {
            if (!addStoryState[userId].longitude && !addStoryState[userId].description) {
                const keyboard = new Keyboard().requestLocation("Send location");
                await ctx.reply("Please send description and location", {
                    reply_markup: {
                        keyboard: keyboard.build()
                    }
                });
            } else if (!addStoryState[userId].description && addStoryState[userId].longitude) {
                await ctx.reply("Please send description");
            }else{
                const keyboard = new Keyboard().requestLocation("Send location");
                await ctx.reply("Please send location",{
                    reply_markup: {
                        keyboard: keyboard.build()
                    }
                });
            }
        }
    }else{
        await ctx.reply("if u wanna add story use /addstory function")
    }
});
bot.on(':location', async (ctx) => {
    const userId = ctx.from.id;
    if(addStoryState[userId]?.addStoryActive) {
        const {latitude, longitude} = ctx.message.location;
        addStoryState[userId].longitude = longitude;
        addStoryState[userId].latitude = latitude;
        if (isAddStoryFunctionGotAllData(userId)) {
            await downloadFileInStorage(addStoryState[userId].fileId, ctx, userId);
            executeAddStory(userId,ctx);
        } else {
            if (!addStoryState[userId].fileId && !addStoryState[userId].description) {
                await ctx.reply("Please send description and photo");
            } else if (!addStoryState[userId].description && addStoryState[userId].fileId) {
                await ctx.reply("Please send description");
            }else{
                await ctx.reply("Please send photo");
            }
        }
    }else{
        await ctx.reply("if u wanna add story use /addstory function")
    }
});
bot.command('hello', async (ctx) => {
    await ctx.reply("Hello!");
});
bot.command('addfriend',async (ctx) => {
    const userId = ctx.from.id;
    addFriendState[userId] = {
        addFriendActive : true
    };
    await ctx.reply("Send contacts of your friends");
})

bot.on('message:contact',async(ctx) => {
    const username = ctx.from.username || ctx.from.first_name;
    const userId = ctx.from.id;
    const userLink = ctx.from.username?`https://t.me/${ctx.from.username}`:`tg://user?id=${userId}`;
    if(addFriendState[userId]?.addFriendActive) {
        const contactId = ctx.message.contact.user_id;
        if(await isUserInDB(contactId)){
            const chatId = await getChatId(contactId)
            const keyboard = new InlineKeyboard().text('Yes',`add_friend_${userId}`).text('No',`decline_friend_${userId}`);
            await bot.api.sendMessage(chatId, `Do u want to add [${username}](${userLink}) as a friend?`,{
                reply_markup: keyboard
            });
            addFriendForUser(userId,contactId);
            await ctx.reply("If u want to add more friends, send contacts and when u send everybody who u want use /cancel");
        }else{
            await ctx.reply(`Your contact hasn't started a conversation with the bot. You can send them this invite link: https://t.me/${ctx.me.username}`)
        }
    }else{
        await ctx.reply("if u wanna add friend use /addfriend function")
    }
})
bot.on('callback_query',async (ctx ) => {
    const callbackData = ctx.callbackQuery.data;
    const username = ctx.from.username || ctx.from.first_name;
    const userId = ctx.from.id;
    const userLink = ctx.from.username?`https://t.me/${ctx.from.username}`:`tg://user?id=${userId}`;
    if(callbackData.startsWith('add_friend')){
        const contactId = callbackData.split('_')[2];
        addFriendForUser(userId,contactId);
        const chatId= await getChatId(contactId);
        await bot.api.sendMessage(chatId, `[${username}](${userLink} has agreed to be friends)`);
        await ctx.answerCallbackQuery("Friend added");
    }else{
        await ctx.answerCallbackQuery("Friend declined");
    }
})
bot.command('cancel', async (ctx) => {
    const userId = ctx.from.id;
    if (addFriendState[userId]?.addFriendActive) {
        addFriendState[userId].addFriendActive = false;
        await ctx.reply("Friend addition process canceled.");
    } else if (addStoryState[userId]?.addStoryActive) {
        resetUserState(userId);
        await ctx.reply("Story addition process canceled.");
    } else {
        await ctx.reply("No active processes to cancel.");
    }
});
bot.on(':text',async (ctx) => {
    const userId = ctx.from.id;
    if(addStoryState[userId]?.addStoryActive) {
        addStoryState[userId].description = ctx.message.text;
        if (isAddStoryFunctionGotAllData(userId)) {
            await downloadFileInStorage(addStoryState[userId].fileId, ctx, userId);
            executeAddStory(userId,ctx);
        } else {
            if (!addStoryState[userId].fileId && !addStoryState[userId].longitude) {
                const keyboard = new Keyboard().requestLocation("Send location")
                await ctx.reply("Please send photo and location",{
                    reply_markup: {
                        keyboard: keyboard.build()
                    }
                });
            } else if (!addStoryState[userId].longitude && addStoryState[userId].fileId) {
                const keyboard = new Keyboard().requestLocation("Send location")
                await ctx.reply("Please send location",{
                    reply_markup: {
                        keyboard: keyboard.build()
                    }
                });
            }else{
                await ctx.reply("Please send photo");
            }
        }
    } else{
        await ctx.reply("if u wanna add story use /addstory function")
    }
});
export const startBot = () => {
    bot.start();
};