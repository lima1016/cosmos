package com.lima.cosmos.ingestion.ingest;

/**
 * NeoWs 수집 결과.
 * @param startDate/endDate 대상 범위
 * @param produced      raw.neo 로 produce 한 접근 레코드 수
 * @param calledNasaApi NASA API 를 실제로 호출했는지(=하루 한도 소모)
 * @param source        "nasa" = 호출함 / "cache" = 범위 전체가 이미 저장돼 있어 스킵
 */
public record NeoIngestResult(
        String startDate,
        String endDate,
        int produced,
        boolean calledNasaApi,
        String source
) {
    static NeoIngestResult skipped(String start, String end) {
        return new NeoIngestResult(start, end, 0, false, "cache");
    }

    static NeoIngestResult fetched(String start, String end, int produced) {
        return new NeoIngestResult(start, end, produced, true, "nasa");
    }
}
