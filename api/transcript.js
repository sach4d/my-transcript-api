// File: /api/transcript.js - Phiên bản cuối cùng, chống chặn

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
        // Bước 1: Giả lập trình duyệt để lấy nội dung trang YouTube
        const youtubePageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const pageResponse = await fetch(youtubePageUrl, {
            headers: {
                // Đây là chìa khóa: Giả danh một trình duyệt Chrome trên Windows
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!pageResponse.ok) {
            throw new Error(`Không thể tải trang YouTube, mã trạng thái: ${pageResponse.status}`);
        }
        const htmlContent = await pageResponse.text();

        // Bước 2: Trích xuất dữ liệu phụ đề từ HTML
        const regex = /"captionTracks":(\[.*?\])/;
        const match = htmlContent.match(regex);
        if (!match || !match[1]) {
            throw new Error('Không tìm thấy "captionTracks" trong nội dung trang. Video có thể không có phụ đề hoặc YouTube đã thay đổi cấu trúc.');
        }

        const captionTracks = JSON.parse(match[1]);
        if (captionTracks.length === 0) {
            throw new Error('Video này không có sẵn phụ đề.');
        }

        // Ưu tiên phụ đề tiếng Việt, nếu không có thì lấy cái đầu tiên
        let transcriptUrl = captionTracks.find(track => track.languageCode === 'vi')?.baseUrl;
        if (!transcriptUrl) {
            transcriptUrl = captionTracks[0]?.baseUrl;
        }

        if (!transcriptUrl) {
            throw new Error('Không tìm thấy URL của tệp phụ đề.');
        }

        // Bước 3: Tải file phụ đề XML
        const transcriptResponse = await fetch(transcriptUrl);
        const xmlContent = await transcriptResponse.text();

        // Bước 4: Phân tích XML để lấy nội dung văn bản
        // Sử dụng regex để trích xuất nội dung từ các thẻ <text>
        const textNodes = [...xmlContent.matchAll(/<text.*?>(.*?)<\/text>/gs)].map(match => match[1]);

        // Nối các đoạn text lại và xử lý các ký tự đặc biệt
        const fullTranscript = textNodes
            .map(text => text.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'))
            .join(' ');

        if (!fullTranscript.trim()) {
            throw new Error('Nội dung phụ đề bị trống.');
        }

        return response.status(200).json({ transcript: fullTranscript });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
