
const { sheets, googleSheetId } = require('../config/googleClients');
const { v4: uuidv4 } = require('uuid');

const SHEET_NAME = 'Users';

/**
 * スプレッドシートから全てのユーザーデータを取得し、ヘッダーと行データを解析する
 * @returns {Promise<Array<Object>>} ユーザーデータの配列
 */
async function getAllUsers() {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: googleSheetId,
            range: SHEET_NAME,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return []; // シートは存在するが、データがない（ヘッダー含む）
        }

        const header = rows[0];
        if (header[0] !== 'user_id' || header[1] !== 'username' || header[2] !== 'password_hash') {
            console.warn(`Warning: The header row in the "${SHEET_NAME}" sheet is not correctly formatted. Expected ['user_id', 'username', 'password_hash'].`);
        }

        return rows.slice(1).map(row => ({
            user_id: row[0],
            username: row[1],
            password_hash: row[2],
        }));

    } catch (err) {
        // GaxiosErrorをキャッチし、より具体的なエラーを提供する
        if (err.code === 404) {
            const errorMessage = `Error: Google Sheet not found. \n1. Make sure the GOOGLE_SHEET_ID in your .env file is correct. \n2. Make sure a sheet named "${SHEET_NAME}" exists in that spreadsheet. \n3. Make sure the service account has 'Editor' permissions on the spreadsheet.`;
            console.error(errorMessage);
            throw new Error(`Configuration error: Could not find the specified Google Sheet or the "${SHEET_NAME}" tab.`);
        }
        // その他のエラーはそのままスローする
        throw err;
    }
}

/**
 * ユーザー名でユーザーを検索する
 * @param {string} username - 検索するユーザー名
 * @returns {Promise<Object|null>} 見つかったユーザーオブジェクト、またはnull
 */
async function findUserByUsername(username) {
    try {
        const allUsers = await getAllUsers();
        const user = allUsers.find(u => u.username === username);
        return user || null;
    } catch (error) {
        console.error('Error finding user by username:', error);
        throw new Error('Failed to access the user sheet.');
    }
}

/**
 * 新しいユーザーを作成する
 * @param {Object} userData - ユーザーデータ
 * @param {string} userData.username - ユーザー名
 * @param {string} userData.password_hash - ハッシュ化されたパスワード
 * @returns {Promise<Object>} 作成されたユーザー情報 { user_id, username }
 */
async function createUser({ username, password_hash }) {
    const user_id = uuidv4();
    const created_at = new Date().toISOString();

    const newRow = [user_id, username, password_hash, created_at];

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: googleSheetId,
            range: `${SHEET_NAME}!A1`, // A1を指定すると最終行に追記される
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [newRow],
            },
        });

        return { user_id, username };
    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Failed to create a new user in the sheet.');
    }
}

module.exports = {
    findUserByUsername,
    createUser,
};
