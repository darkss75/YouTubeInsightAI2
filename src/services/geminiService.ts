import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateStrategy(analysisData: any) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      다음은 유튜브 채널/영상 분석 데이터입니다:
      ${JSON.stringify(analysisData, null, 2)}

      이 데이터를 바탕으로 다음 항목을 포함한 상세한 유튜브 운영 전략을 수립해줘:
      1. 현재 채널의 강점과 약점 분석
      2. 타겟 시청자층 및 콘텐츠 방향성 제안
      3. 조회수 및 참여도(좋아요, 댓글) 증대를 위한 구체적인 액션 플랜
      4. 쇼츠와 일반 영상의 비중 및 활용 전략
      5. 추천 해시태그 및 제목 키워드

      답변은 한국어로 작성하고, 가독성 좋게 마크다운 형식을 사용해줘.
    `,
  });

  const response = await model;
  return response.text;
}

export async function summarizeVideo(videoTitle: string, description: string) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      다음 유튜브 영상의 제목과 설명을 바탕으로 핵심 내용을 3문장 이내로 요약해줘:
      제목: ${videoTitle}
      설명: ${description}

      답변은 한국어로 작성해줘.
    `,
  });

  const response = await model;
  return response.text;
}
