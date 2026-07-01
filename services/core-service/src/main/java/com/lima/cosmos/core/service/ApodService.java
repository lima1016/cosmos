package com.lima.cosmos.core.service;

import com.lima.cosmos.core.domain.ApodDocument;
import com.lima.cosmos.core.kafka.ApodMessage;
import com.lima.cosmos.core.repository.ApodSearchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/** APOD 저장/조회 — Elasticsearch(apod 인덱스). */
@Service
@RequiredArgsConstructor
public class ApodService {

    private final ApodSearchRepository repository;

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
        return repository.findTop1ByOrderByDateDesc();
    }

    /** 해당 날짜(YYYY-MM-DD)의 APOD가 이미 ES에 있는지. date가 곧 @Id 라 existsById 로 조회. */
    public boolean exists(String date) {
        if (date == null || date.isBlank()) return false;
        return repository.existsById(date);
    }

    public List<ApodDocument> recent() {
        return repository.findTop24ByOrderByDateDesc();
    }
}
