// File: /api/transcript.js - Phiên bản cuối cùng, sử dụng API nội bộ của YouTube

import { Innertube } from 'youtubei.js';

export default async function handler(request, response) {
    // Cấu hình CORS
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { videoId } = request.query;

    if (!videoId) {
        return response.status(400).json({ error: 'Thiếu tham số videoId' });
    }

    try {
        // Khởi tạo một client để giao tiếp với API của YouTube
        const youtube = await Innertube.create();

        // Gọi trực tiếp đến chức năng lấy transcript của API
        const transcript = await youtube.getTranscript(videoId);

        if (!transcript || !transcript.content || transcript.content.length === 0) {
            throw new Error('Không tìm thấy nội dung phụ đề hoặc phụ đề đã bị tắt.');
        }

        // Dữ liệu trả về là một mảng các dòng, ta chỉ cần nối chúng lại
        const fullTranscript = transcript.content.map(line => line.text).join(' ');

        // Trả về kết quả thành công
        return response.status(200).json({ transcript: fullTranscript });

    } catch (error) {
        // Thư viện sẽ tự động báo lỗi nếu video không hợp lệ hoặc không có phụ đề
        return response.status(500).json({ error: `Không thể lấy phụ đề: ${error.message}` });
    }
}
