
const supabase = require('../config/supabaseClient');

/**
 * 全てのチャンネルを取得する
 * @returns {Promise<Array<Object>>} チャンネルの配列
 */
async function getAllChannels() {
    const { data, error } = await supabase
        .from('channels')
        .select('id, name, description, created_at')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching channels:', error);
        throw new Error('Failed to fetch channels.');
    }
    return data;
}

/**
 * 新しいチャンネルを作成する
 * @param {Object} channelData - チャンネルデータ
 * @param {string} channelData.name - チャンネル名
 * @param {string} [channelData.description] - チャンネルの説明
 * @param {string} channelData.created_by - 作成したユーザーのUUID
 * @returns {Promise<Object>} 作成されたチャンネル情報
 */
async function createChannel({ name, description, created_by }) {
    const { data, error } = await supabase
        .from('channels')
        .insert([{ name, description, created_by }])
        .select();

    if (error) {
        console.error('Error creating channel:', error);
        throw new Error('Failed to create channel.');
    }

    // データが返されなかった場合のチェックを追加
    if (!data || data.length === 0) {
        console.error('Channel created, but no data returned. Check RLS policies.');
        // SupabaseのRLS設定によっては、INSERTは成功してもSELECTが許可されていない場合がある。
        throw new Error('Failed to create channel: Could not retrieve created channel data. Please check permissions (RLS).');
    }

    return data[0];
}

module.exports = {
    getAllChannels,
    createChannel,
};
