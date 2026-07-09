package com.lima.cosmos.core.service;

import com.lima.cosmos.core.client.AiTranslationClient;
import com.lima.cosmos.core.domain.ApodDocument;
import com.lima.cosmos.core.kafka.ApodMessage;
import com.lima.cosmos.core.repository.ApodSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.elasticsearch.NoSuchIndexException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** APOD 저장/조회 — Elasticsearch(apod 인덱스). */
@Service
@RequiredArgsConstructor
public class ApodService {

    private final ApodSearchRepository repository;
    private final AiTranslationClient translationClient;

    public void save(ApodMessage msg) {
        repository.save(ApodDocument.builder()
                .date(msg.date())
                .title(msg.title())
                .explanation(msg.explanation())
                .url(msg.url())
                .hdurl(msg.hdurl())
                .mediaType(msg.mediaType())
                .copyright(msg.copyright())
                .build());
    }

    public Optional<ApodDocument> latest() {
        try {
            return repository.findTop1ByOrderByDateDesc();
        } catch (NoSuchIndexException e) {
            // 아직 수집 전이라 apod 인덱스가 없음 → 데이터 없음으로 취급(500 방지).
            return Optional.empty();
        }
    }

    /** 해당 날짜(YYYY-MM-DD)의 APOD가 이미 ES에 있는지. date가 곧 @Id 라 existsById 로 조회. */
    public boolean exists(String date) {
        if (date == null || date.isBlank()) return false;
        return repository.existsById(date);
    }

    /**
     * 갤러리 목록(24개 페이지, 최신순).
     * - 파라미터 없음: 최신 24
     * - before: 해당 날짜보다 과거 24 (더보기 = 현재 목록의 가장 오래된 날짜 전달)
     */
    public List<ApodDocument> page(String before) {
        try {
            if (before != null && !before.isBlank()) {
                return repository.findTop24ByDateLessThanOrderByDateDesc(before);
            }
            return repository.findTop24ByOrderByDateDesc();
        } catch (NoSuchIndexException e) {
            return List.of();
        }
    }

    /**
     * 해당 날짜 APOD 를 한국어로. 이미 번역돼 있으면(titleKo 존재) 그대로 반환(캐시 히트),
     * 없으면 ai-service 로 제목·본문만 번역해 ES에 저장 후 반환. copyright(작성자)는 원문 유지.
     */
    public Optional<ApodDocument> translate(String date) {
        Optional<ApodDocument> found;
        try {
            found = repository.findById(date);
        } catch (NoSuchIndexException e) {
            return Optional.empty(); // 인덱스 없음 → 번역할 문서 없음(204)
        }
        if (found.isEmpty()) {
            return found;
        }
        ApodDocument doc = found.get();
        if (doc.getTitleKo() != null && !doc.getTitleKo().isBlank()) {
            return Optional.of(doc); // 캐시 히트 → 재번역 없음
        }
        AiTranslationClient.Translation t = translationClient.translate(doc.getTitle(), doc.getExplanation());
        if (t == null) {
            return Optional.of(doc); // 번역 실패 → 원문 그대로
        }
        doc.setTitleKo(t.titleKo());
        doc.setExplanationKo(t.explanationKo());
        repository.save(doc);
        return Optional.of(doc);
    }
}
