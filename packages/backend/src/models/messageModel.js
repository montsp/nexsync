
const supabase = require('../config/supabaseClient');

/**
 * 特定のチャンネルのメッセージ履歴を取得する（親メッセージのみ、ページネーション対応）
 * @param {number} channelId - チャンネルID
 * @param {number} page - ページ番号 (1から始まる)
 * @param {number} limit - 1ページあたりのメッセージ数
 * @returns {Promise<Array<Object>>} メッセージの配列
 */
async function getChannelMessages(channelId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    console.log(`Fetching messages for channelId: ${channelId}, page: ${page}, limit: ${limit}`);

    const { data, error } = await supabase
        .from('messages')
        .select('id, channel_id, user_id, content, created_at')
        .eq('channel_id', channelId)
        .is('parent_message_id', null) // 親メッセージのみ取得
        .order('created_at', { ascending: false }) // 新しいメッセージが先頭に来るように
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching messages from Supabase:', error);
        throw new Error('Failed to fetch messages.');
    }
    return data;
}

/**
 * 特定の親メッセージに紐づく返信一覧を取得する
 * @param {number} parentMessageId - 親メッセージのID
 * @returns {Promise<Array<Object>>} 返信メッセージの配列
 */
async function getThreadMessages(parentMessageId) {
    const { data, error } = await supabase
        .from('messages')
        .select('id, channel_id, user_id, content, created_at, parent_message_id')
        .eq('parent_message_id', parentMessageId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching thread messages:', error);
        throw new Error('Failed to fetch thread messages.');
    }
    return data;
}

/**
 * 新しいメッセージを保存する
 * @param {Object} messageData - メッセージデータ
 * @param {number} messageData.channel_id - チャンネルID
 * @param {string} messageData.user_id - ユーザーID
 * @param {string} messageData.content - メッセージ内容
 * @param {number} [messageData.parent_message_id] - 親メッセージID (スレッドの場合)
 * @returns {Promise<Object>} 保存されたメッセージ情報
 */
async function createMessage({ channel_id, user_id, content, parent_message_id = null }) {
    const { data, error } = await supabase
        .from('messages')
        .insert([{ channel_id, user_id, content, parent_message_id }])
        .select();

    if (error) {
        console.error('Error creating message:', error);
        throw new Error('Failed to create message.');
    }
    return data[0];
}

module.exports = {
    getChannelMessages,
    getThreadMessages,
    createMessage,
};
