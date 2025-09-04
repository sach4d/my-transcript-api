// File: /api/transcript.js

export default async function handler(request, response) {
    // Cho phép truy cập từ bất kỳ tên miền nào
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý yêu cầu OPTIONS (bắt buộc cho CORS)
    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const { videoId } = request.query;

    if (!videoId) {
        return response.status(400).json({ error: 'Missing videoId parameter' });
    }

    try {
        // Lấy nội dung trang HTML của YouTube
        const youtubePageUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const pageResponse = await fetch(youtubePageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        if (!pageResponse.ok) {
            throw new Error(`Failed to fetch YouTube page, status: ${pageResponse.status}`);
        }
        const htmlContent = await pageResponse.text();
        
        // Trích xuất dữ liệu captionTracks
        const regex = /"captionTracks":(\[.*?\])/;
        const match = htmlContent.match(regex);
        if (!match || !match[1]) {
            throw new Error('Could not find caption tracks in the YouTube page. The video may not have subtitles.');
        }

        const captionTracks = JSON.parse(match[1]);
        if (captionTracks.length === 0) {
            throw new Error('No caption tracks available for this video.');
        }
        
        // Ưu tiên phụ đề tiếng Việt, nếu không có thì lấy cái đầu tiên
        let transcriptUrl = captionTracks.find(track => track.languageCode === 'vi')?.baseUrl;
        if (!transcriptUrl) {
            transcriptUrl = captionTracks[0]?.baseUrl;
        }

        if (!transcriptUrl) {
            throw new Error('Could not find the transcript URL.');
        }

        // Tải file phụ đề XML
        const transcriptResponse = await fetch(transcriptUrl);
        const xmlContent = await transcriptResponse.text();

        // Phân tích XML để lấy text
        const textNodes = [...xmlContent.matchAll(/<text.*?>(.*?)<\/text>/gs)].map(match => match[1]);
        let fullTranscript = textNodes
            .map(text => text.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'))
            .join(' ');

        if (!fullTranscript.trim()) {
            throw new Error('Transcript content is empty.');
        }

        // Trả về kết quả thành công
        return response.status(200).json({ transcript: fullTranscript });

    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}
