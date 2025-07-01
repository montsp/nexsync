const { drive } = require('../config/googleClients');
const stream = require('stream');

const UPLOAD_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

/**
 * Google Driveにファイルをアップロードする
 * @param {object} file - multerから受け取ったファイルオブジェクト
 * @returns {Promise<string>} アップロードされたファイルのID
 */
async function uploadFile(file) {
  if (!UPLOAD_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set in .env file.');
  }

  const bufferStream = new stream.PassThrough();
  bufferStream.end(file.buffer);

  const { data } = await drive.files.create({
    media: {
      mimeType: file.mimetype,
      body: bufferStream,
    },
    requestBody: {
      name: file.originalname,
      parents: [UPLOAD_FOLDER_ID],
    },
    fields: 'id',
  });

  return data.id;
}

/**
 * Google Driveからファイルのメタデータを取得する
 * @param {string} fileId - Google DriveのファイルID
 * @returns {Promise<object>} ファイルのメタデータ
 */
async function getFileInfo(fileId) {
    const { data } = await drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, webViewLink, webContentLink'
    });
    return data;
}

/**
 * Google Driveからファイルをダウンロードするためのストリームを取得する
 * @param {string} fileId - Google DriveのファイルID
 * @returns {Promise<any>} ファイルのストリーム
 */
async function downloadFile(fileId) {
  const { data: stream } = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return stream;
}

module.exports = {
  uploadFile,
  getFileInfo,
  downloadFile,
};
