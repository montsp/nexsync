
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
 * @param {number[]} [messageData.mentioned_user_ids] - メンションされたユーザーIDの配列
 * @param {number} [messageData.parent_message_id] - 親メッセージID (スレッドの場合)
 * @returns {Promise<Object>} 保存されたメッセージ情報
 */
async function createMessage({ channel_id, user_id, content, mentioned_user_ids = [], parent_message_id = null }) {
    const { data, error } = await supabase
        .from('messages')
        .insert([{ channel_id, user_id, content, mentioned_user_ids, parent_message_id }])
        .select();

    if (error) {
        console.error('Error creating message:', error);
        throw new Error('Failed to create message.');
    }
    return data[0];
}

/**
 * メッセージのリアクションを切り替える
 * @param {number} messageId - メッセージID
 * @param {string} userId - ユーザーID
 * @param {string} emoji - 絵文字
 * @returns {Promise<Object>} 更新されたメッセージ
 */
async function toggleReaction(messageId, userId, emoji) {
    const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

    if (fetchError) throw new Error('Failed to fetch message.');

    const reactions = message.reactions || [];
    const existingReactionIndex = reactions.findIndex(r => r.user_id === userId && r.emoji === emoji);

    if (existingReactionIndex > -1) {
        reactions.splice(existingReactionIndex, 1);
    } else {
        reactions.push({ user_id: userId, emoji });
    }

    const { data, error: updateError } = await supabase
        .from('messages')
        .update({ reactions })
        .eq('id', messageId)
        .select();

    if (updateError) throw new Error('Failed to toggle reaction.');

    return data[0];
}

/**
 * メッセージを編集する
 * @param {number} messageId - メッセージID
 * @param {string} userId - ユーザーID
 * @param {string} content - 新しいメッセージ内容
 * @returns {Promise<Object>} 更新されたメッセージ
 */
async function updateMessage(messageId, userId, content) {
    const { data, error } = await supabase
        .from('messages')
        .update({ content, is_edited: true, updated_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', userId) // 自分のメッセージのみ編集可能
        .select();

    if (error) throw new Error('Failed to update message.');
    return data[0];
}

/**
 * メッセージを論理削除する
 * @param {number} messageId - メッセージID
 * @returns {Promise<Object>} 削除されたメッセージ
 */
async function deleteMessage(messageId) {
    const { data, error } = await supabase
        .from('messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), content: 'このメッセージは削除されました。' })
        .eq('id', messageId)
        .select();

    if (error) throw new Error('Failed to delete message.');
    return data[0];
}

module.exports = {
    getChannelMessages,
    getThreadMessages,
    createMessage,
    toggleReaction,
    updateMessage,
    deleteMessage,
};
