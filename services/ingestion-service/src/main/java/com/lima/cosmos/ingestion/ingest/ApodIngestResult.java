package com.lima.cosmos.ingestion.ingest;

/**
 * APOD 오늘 수집 결과.
 * @param date          대상 날짜(YYYY-MM-DD, APOD 발행 기준 미 동부시각)
 * @param source        "nasa" = NASA API 호출함 / "cache" = 이미 저장돼 있어 스킵
 * @param calledNasaApi NASA API 를 실제로 호출했는지(=하루 한도를 소모했는지)
 * @param title         수집한 사진 제목(스킵 시 null)
 */
public record ApodIngestResult(String date, String source, boolean calledNasaApi, String title) {

    static ApodIngestResult skipped(String date) {
        return new ApodIngestResult(date, "cache", false, null);
    }

    static ApodIngestResult fetched(String date, String title) {
        return new ApodIngestResult(date, "nasa", true, title);
    }
}
