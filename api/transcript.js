// File: /api/transcript.js - Phiên bản sử dụng thư viện chuyên dụng

import { YoutubeTranscript } from 'youtube-transcript';

export default async function handler(request, response) {
    // Cấu hình CORS để trang web của bạn có thể gọi API này
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý yêu cầu pre-flight của trình duyệt
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { videoId } = request.query;

    if (!videoId) {
        return response.status(400).json({ error: 'Thiếu tham số videoId' });
    }

    try {
        // Sử dụng thư viện để lấy phụ đề một cách đáng tin cậy
        const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);

        if (!transcriptData || transcriptData.length === 0) {
            throw new Error('Không tìm thấy phụ đề cho video này.');
        }

        // Nối các đoạn văn bản phụ đề thành một chuỗi duy nhất
        const fullTranscript = transcriptData.map(item => item.text).join(' ');

        // Trả về kết quả thành công
        return response.status(200).json({ transcript: fullTranscript });

    } catch (error) {
        // Thư viện sẽ báo lỗi cụ thể nếu không lấy được phụ đề
        return response.status(500).json({ error: `Không thể lấy phụ đề: ${error.message}` });
    }
}
